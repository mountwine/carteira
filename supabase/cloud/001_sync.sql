-- Foravento: sincronização na nuvem e código de viagem.
-- Rode uma vez, inteiro, no SQL Editor de um projeto Supabase novo e vazio.
-- Escrita só por funções (com checagem de versão); leitura só para participantes.

create table public.cloud_trips (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  version integer not null default 1,
  deleted boolean not null default false,
  join_code text not null unique,
  updated_at timestamptz not null default now()
);

create table public.cloud_members (
  trip_id uuid not null references public.cloud_trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index cloud_members_user on public.cloud_members (user_id);

create table public.cloud_records (
  id uuid primary key,
  trip_id uuid not null references public.cloud_trips (id) on delete cascade,
  owner_id text not null,
  kind text not null,
  visibility text not null default 'trip' check (visibility in ('trip', 'private')),
  version integer not null default 1,
  deleted boolean not null default false,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index cloud_records_trip on public.cloud_records (trip_id, updated_at);

create table public.cloud_join_attempts (
  user_id uuid not null,
  at timestamptz not null default now()
);
create index cloud_join_attempts_user on public.cloud_join_attempts (user_id, at);

alter table public.cloud_trips enable row level security;
alter table public.cloud_members enable row level security;
alter table public.cloud_records enable row level security;
alter table public.cloud_join_attempts enable row level security;

create function public.is_cloud_member(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.cloud_members
    where trip_id = target and user_id = auth.uid()
  );
$$;

create policy cloud_trips_read on public.cloud_trips
  for select to authenticated using (public.is_cloud_member(id));
create policy cloud_members_read on public.cloud_members
  for select to authenticated using (public.is_cloud_member(trip_id));
create policy cloud_records_read on public.cloud_records
  for select to authenticated using (
    public.is_cloud_member(trip_id)
    and (visibility = 'trip' or owner_id = auth.uid()::text)
  );

revoke all on public.cloud_trips, public.cloud_members, public.cloud_records,
  public.cloud_join_attempts from anon, authenticated;
grant select on public.cloud_trips, public.cloud_members, public.cloud_records
  to authenticated;

-- Código da viagem: 6 símbolos sem ambíguos (sem 0, 1, 8 e B), sorteio sem viés.
create function public.new_cloud_code()
returns text language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := '2345679ACDEF';
  code text;
  bytes bytea;
  i integer;
  b integer;
begin
  loop
    code := '';
    while length(code) < 6 loop
      bytes := uuid_send(gen_random_uuid());
      i := 0;
      while i < 16 and length(code) < 6 loop
        -- bytes 6 e 8 têm bits fixos no UUID; 252 = 12 * 21 evita viés.
        b := get_byte(bytes, i);
        if i not in (6, 8) and b < 252 then
          code := code || substr(alphabet, (b % 12) + 1, 1);
        end if;
        i := i + 1;
      end loop;
    end loop;
    exit when not exists (select 1 from public.cloud_trips where join_code = code);
  end loop;
  return code;
end;
$$;

-- Cria ou atualiza a viagem. expected = versão que o aparelho viu (null para criar).
create function public.push_cloud_trip(
  p_id uuid, p_expected integer, p_data jsonb, p_deleted boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cur public.cloud_trips%rowtype;
  new_version integer;
  owner_name text;
begin
  if uid is null then raise exception 'AUTH'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'INVALID'; end if;
  select * into cur from public.cloud_trips where id = p_id for update;
  if not found then
    if p_expected is not null then
      return jsonb_build_object('ok', false, 'reason', 'missing');
    end if;
    owner_name := coalesce((
      select m ->> 'displayName'
      from jsonb_array_elements(coalesce(p_data -> 'members', '[]'::jsonb)) m
      where m ->> 'userId' = uid::text limit 1
    ), 'Viajante');
    insert into public.cloud_trips (id, owner_id, data, deleted, join_code)
    values (p_id, uid, p_data, p_deleted, public.new_cloud_code());
    insert into public.cloud_members (trip_id, user_id, display_name, role)
    values (p_id, uid, owner_name, 'owner');
    return jsonb_build_object('ok', true, 'version', 1);
  end if;
  if not public.is_cloud_member(p_id) then raise exception 'ACCESS'; end if;
  if cur.version is distinct from p_expected then
    return jsonb_build_object(
      'ok', false, 'reason', 'conflict', 'version', cur.version,
      'data', cur.data, 'deleted', cur.deleted, 'updated_at', cur.updated_at
    );
  end if;
  update public.cloud_trips
    set data = p_data, deleted = p_deleted, version = version + 1, updated_at = now()
    where id = p_id returning version into new_version;
  return jsonb_build_object('ok', true, 'version', new_version);
end;
$$;

-- Grava vários registros de uma viagem. Cada linha: id, expected, kind, owner_id,
-- visibility, deleted, data. Resultado por linha, na mesma ordem.
create function public.push_cloud_records(p_trip uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  row_in jsonb;
  cur public.cloud_records%rowtype;
  results jsonb := '[]'::jsonb;
  rid uuid;
  expected integer;
  new_version integer;
begin
  if uid is null then raise exception 'AUTH'; end if;
  if not public.is_cloud_member(p_trip) then raise exception 'ACCESS'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'INVALID'; end if;
  for row_in in select * from jsonb_array_elements(p_rows) loop
    rid := (row_in ->> 'id')::uuid;
    expected := nullif(row_in ->> 'expected', '')::integer;
    select * into cur from public.cloud_records where id = rid for update;
    if not found then
      if expected is not null then
        results := results || jsonb_build_object('id', rid, 'ok', false, 'reason', 'missing');
        continue;
      end if;
      if coalesce(row_in ->> 'owner_id', '') <> uid::text then
        results := results || jsonb_build_object('id', rid, 'ok', false, 'reason', 'access');
        continue;
      end if;
      insert into public.cloud_records (id, trip_id, owner_id, kind, visibility, deleted, data)
      values (
        rid, p_trip, uid::text, row_in ->> 'kind',
        coalesce(row_in ->> 'visibility', 'trip'),
        coalesce((row_in ->> 'deleted')::boolean, false), row_in -> 'data'
      );
      results := results || jsonb_build_object('id', rid, 'ok', true, 'version', 1);
      continue;
    end if;
    if cur.trip_id <> p_trip
       or (cur.visibility = 'private' and cur.owner_id <> uid::text) then
      results := results || jsonb_build_object('id', rid, 'ok', false, 'reason', 'access');
      continue;
    end if;
    if cur.version is distinct from expected then
      results := results || jsonb_build_object(
        'id', rid, 'ok', false, 'reason', 'conflict', 'version', cur.version,
        'data', cur.data, 'deleted', cur.deleted, 'visibility', cur.visibility,
        'owner_id', cur.owner_id, 'kind', cur.kind, 'updated_at', cur.updated_at
      );
      continue;
    end if;
    update public.cloud_records
      set data = row_in -> 'data',
          deleted = coalesce((row_in ->> 'deleted')::boolean, false),
          visibility = case when cur.owner_id = uid::text
            then coalesce(row_in ->> 'visibility', cur.visibility) else cur.visibility end,
          version = version + 1, updated_at = now()
      where id = rid returning version into new_version;
    results := results || jsonb_build_object('id', rid, 'ok', true, 'version', new_version);
  end loop;
  return results;
end;
$$;

-- Entra numa viagem pelo código. Erros viram resposta (não exceção) para contar tentativas.
create function public.join_cloud_trip(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  trip public.cloud_trips%rowtype;
  clean_name text := left(trim(coalesce(p_name, '')), 60);
begin
  if uid is null then raise exception 'AUTH'; end if;
  if (select count(*) from public.cloud_join_attempts
      where user_id = uid and at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;
  if clean_name = '' then clean_name := 'Viajante'; end if;
  select * into trip from public.cloud_trips
    where join_code = upper(trim(coalesce(p_code, ''))) and not deleted for update;
  if not found then
    insert into public.cloud_join_attempts (user_id) values (uid);
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  insert into public.cloud_members (trip_id, user_id, display_name)
  values (trip.id, uid, clean_name) on conflict do nothing;
  if not (coalesce(trip.data -> 'members', '[]'::jsonb)
          @> jsonb_build_array(jsonb_build_object('userId', uid::text))) then
    update public.cloud_trips set
      data = jsonb_set(
        data, '{members}',
        coalesce(data -> 'members', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'userId', uid::text, 'displayName', clean_name,
          'invitationState', 'accepted', 'preferences', '{}'::jsonb))
      ),
      version = version + 1, updated_at = now()
    where id = trip.id;
  end if;
  return jsonb_build_object('ok', true, 'trip_id', trip.id);
end;
$$;

-- Só o dono gera um código novo; o antigo deixa de valer.
create function public.rotate_cloud_code(p_trip uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare fresh text;
begin
  if auth.uid() is null then raise exception 'AUTH'; end if;
  if not exists (select 1 from public.cloud_members
                 where trip_id = p_trip and user_id = auth.uid() and role = 'owner') then
    raise exception 'ACCESS';
  end if;
  fresh := public.new_cloud_code();
  update public.cloud_trips set join_code = fresh, updated_at = now() where id = p_trip;
  return fresh;
end;
$$;

-- Qualquer participante, menos o dono, pode sair da viagem.
create function public.leave_cloud_trip(p_trip uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH'; end if;
  if exists (select 1 from public.cloud_members
             where trip_id = p_trip and user_id = auth.uid() and role = 'owner') then
    raise exception 'OWNER';
  end if;
  delete from public.cloud_members where trip_id = p_trip and user_id = auth.uid();
end;
$$;

revoke all on function
  public.is_cloud_member(uuid), public.new_cloud_code(),
  public.push_cloud_trip(uuid, integer, jsonb, boolean),
  public.push_cloud_records(uuid, jsonb), public.join_cloud_trip(text, text),
  public.rotate_cloud_code(uuid), public.leave_cloud_trip(uuid)
  from public, anon, authenticated;
grant execute on function
  public.is_cloud_member(uuid),
  public.push_cloud_trip(uuid, integer, jsonb, boolean),
  public.push_cloud_records(uuid, jsonb), public.join_cloud_trip(text, text),
  public.rotate_cloud_code(uuid), public.leave_cloud_trip(uuid)
  to authenticated;
