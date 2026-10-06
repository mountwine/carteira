-- Execute uma vez em um projeto Supabase de desenvolvimento.
begin;
create schema if not exists private;
revoke all on schema private from public;
create table public.users (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (length(name) between 1 and 80),
 language text not null default 'pt-BR', currency text not null default 'BRL',
 preferences jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.trips (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 100),
 cover text not null default '/images/los-angeles.jpg', start_date date not null, end_date date not null,
 currency text not null default 'USD', pace text not null default 'balanced' check(pace in ('relaxed','balanced','intense')),
 is_demo boolean not null default false, created_by uuid not null references auth.users(id),
 version bigint not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(end_date>=start_date)
);
create table public.trip_members (
 trip_id uuid not null references public.trips(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null, invitation_state text not null default 'accepted' check(invitation_state in ('accepted','pending')),
 preferences jsonb not null default '{}', primary key(trip_id,user_id)
);
create index trip_members_user on public.trip_members(user_id);
create table public.destinations (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
 city text not null, country text not null, start_date date not null, end_date date not null,
 timezone text not null, transport text[] not null default '{}',check(end_date>=start_date)
);
create index destinations_trip on public.destinations(trip_id);
create function private.is_member(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.trip_members m where m.trip_id=target and m.user_id=auth.uid() and m.invitation_state='accepted');
$$;
revoke all on function private.is_member(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_member(uuid) to authenticated;
alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.destinations enable row level security;
create policy own_profile_read on public.users for select to authenticated using(id=auth.uid());
create policy own_profile_update on public.users for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy member_trip_read on public.trips for select to authenticated using(private.is_member(id));
create policy member_trip_update on public.trips for update to authenticated using(private.is_member(id)) with check(private.is_member(id));
create policy member_trip_delete on public.trips for delete to authenticated using(private.is_member(id));
create policy member_list on public.trip_members for select to authenticated using(private.is_member(trip_id));
create policy own_trip_preferences on public.trip_members for update to authenticated using(user_id=auth.uid() and private.is_member(trip_id)) with check(user_id=auth.uid() and private.is_member(trip_id));
create policy destination_read on public.destinations for select to authenticated using(private.is_member(trip_id));
create policy destination_insert on public.destinations for insert to authenticated with check(private.is_member(trip_id));
create policy destination_update on public.destinations for update to authenticated using(private.is_member(trip_id)) with check(private.is_member(trip_id));
create policy destination_delete on public.destinations for delete to authenticated using(private.is_member(trip_id));
-- Privilégios explícitos: identidade, criação e associação não são alteráveis pelo cliente.
revoke all on public.users,public.trips,public.trip_members,public.destinations from anon,authenticated;
grant select on public.users,public.trips,public.trip_members,public.destinations to authenticated;
grant update(name,language,currency,preferences) on public.users to authenticated;
grant update(name,cover,start_date,end_date,currency,pace) on public.trips to authenticated;
grant delete on public.trips to authenticated;
grant update(preferences) on public.trip_members to authenticated;
grant insert,update,delete on public.destinations to authenticated;
create function private.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 insert into public.users(id,name) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'name',''),'Viajante'),80));
 return new;
 end;
$$;
revoke all on function private.on_signup() from public;
create trigger create_profile after insert on auth.users for each row execute function private.on_signup();
-- Também atende contas existentes na configuração inicial.
insert into public.users(id,name) select id,left(coalesce(nullif(raw_user_meta_data->>'name',''),'Viajante'),80) from auth.users on conflict do nothing;
create function private.bump_trip_version() returns trigger language plpgsql set search_path='' as $$
 begin new.version=old.version+1;new.updated_at=now();return new;end;
$$;
create trigger trip_version before update on public.trips for each row execute function private.bump_trip_version();
create function public.create_demo_trip() returns uuid language plpgsql security definer set search_path='' as $$
 declare current_user_id uuid:=auth.uid(); trip_uuid uuid; user_name text;
 begin
 if current_user_id is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(current_user_id::text,0));
 select id into trip_uuid from public.trips where created_by=current_user_id and is_demo=true limit 1;
 if trip_uuid is not null then return trip_uuid;end if;
 select name into user_name from public.users where id=current_user_id;
 insert into public.trips(name,start_date,end_date,created_by,is_demo) values('USA 2027','2027-01-20','2027-02-07',current_user_id,true) returning id into trip_uuid;
 insert into public.trip_members(trip_id,user_id,display_name) values(trip_uuid,current_user_id,coalesce(user_name,'Viajante'));
 insert into public.destinations(trip_id,city,country,start_date,end_date,timezone,transport) values(trip_uuid,'Los Angeles','Estados Unidos','2027-01-20','2027-02-07','America/Los_Angeles',array['car']);
 return trip_uuid;
 end;
$$;
revoke all on function public.create_demo_trip() from public,anon;
grant execute on function public.create_demo_trip() to authenticated;
-- Reserva privada para anexos futuros; sem policies de leitura/escrita nesta etapa.
insert into storage.buckets(id,name,public) values('trip-private','trip-private',false) on conflict(id) do nothing;
commit;
