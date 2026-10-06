begin;
-- All collaboration writes go through version-checked atomic functions.
revoke update,delete on public.trips from authenticated;
revoke update(name,cover,start_date,end_date,currency,pace) on public.trips from authenticated;
revoke insert,update,delete on public.destinations from authenticated;
create table public.travel_records (
 id uuid primary key, trip_id uuid not null references public.trips(id) on delete cascade,
 kind text not null check(kind in ('activity','reservation','expense','shopping','bag','packing','checklist','document','memory','saved','budget','profile','emergency','day','note','proposal','message')),
 owner_id uuid not null references auth.users(id), visibility text not null check(visibility in ('trip','private')),
 version bigint not null default 1, updated_at timestamptz not null default now(),deleted boolean not null default false,
 data jsonb not null check(jsonb_typeof(data)='object' and length(data->>'title') between 1 and 160),
 check(kind not in ('profile','emergency','message','proposal') or visibility='private')
);
create index travel_records_trip on public.travel_records(trip_id,kind);
alter table public.travel_records enable row level security;
create policy record_read on public.travel_records for select to authenticated using(private.is_member(trip_id) and (visibility='trip' or owner_id=auth.uid()));
revoke all on public.travel_records from anon,authenticated;
grant select on public.travel_records to authenticated;
create table private.mutation_receipts(user_id uuid not null,request_id uuid not null,trip_id uuid not null,created_at timestamptz default now(),primary key(user_id,request_id));
create table private.record_history(id bigint generated always as identity primary key,request_id uuid not null,user_id uuid not null,trip_id uuid not null,previous jsonb not null,created_at timestamptz default now());
create function public.commit_travel_changes(request_id uuid,target_trip uuid,changes jsonb) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();item jsonb;old public.travel_records%rowtype;found_old boolean;target_id uuid;payload jsonb;visibility_value text;owner_value uuid;kind_value text;file_path text;trip public.trips%rowtype;
begin
 if actor is null or not private.is_member(target_trip) then raise exception 'ACCESS: membership required';end if;
 select * into trip from public.trips where id=target_trip for update;
 if exists(select 1 from private.mutation_receipts r where r.user_id=actor and r.request_id=commit_travel_changes.request_id) then return;end if;
 if jsonb_typeof(changes)<>'array' or jsonb_array_length(changes) not between 1 and 200 or octet_length(changes::text)>2000000 then raise exception 'Invalid mutation';end if;
 if (select count(distinct x->>'id') from jsonb_array_elements(changes) x)<>jsonb_array_length(changes) then raise exception 'Duplicate record';end if;
 for item in select * from jsonb_array_elements(changes) loop
  target_id:=(item->>'id')::uuid;payload:=item->'data';visibility_value:=item->>'visibility';owner_value:=(item->>'owner_id')::uuid;kind_value:=item->>'kind';
  select * into old from public.travel_records where id=target_id for update;found_old:=found;
  if found_old then
   if old.trip_id<>target_trip or (old.visibility='private' and old.owner_id<>actor) then raise exception 'ACCESS: record unavailable';end if;
   if old.version is distinct from (item->>'expected')::bigint then raise exception 'CONFLICT: record changed';end if;
   if old.owner_id<>owner_value or old.kind<>kind_value or (old.visibility<>visibility_value and old.owner_id<>actor) then raise exception 'ACCESS: identity is immutable';end if;
  else
   if item->>'expected' is not null then raise exception 'CONFLICT: missing record';end if;
   if owner_value<>actor then raise exception 'ACCESS: invalid owner';end if;
  end if;
  if jsonb_typeof(payload)<>'object' or coalesce(length(payload->>'title'),0) not between 1 and 160 then raise exception 'Title required';end if;
  if not coalesce((item->>'deleted')::boolean,false) then
   if kind_value='activity' then
    if (payload->>'date')::date not between trip.start_date and trip.end_date or (payload->>'duration')::numeric not between 1 and 1440 or coalesce(payload->>'date','')='' then raise exception 'Activity outside trip';end if;
    if coalesce(payload->>'time','')<>'' and payload->>'time' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid time';end if;
    if exists(select 1 from jsonb_array_elements_text(payload->'participants') u where not exists(select 1 from public.trip_members m where m.trip_id=target_trip and m.user_id::text=u and m.invitation_state='accepted')) then raise exception 'Invalid participant';end if;
   elsif kind_value='expense' then
    if (payload->>'amount')::numeric<0 or (payload->>'rate')::numeric<=0 or not exists(select 1 from public.trip_members m where m.trip_id=target_trip and m.user_id::text=payload->>'payer' and m.invitation_state='accepted') then raise exception 'Invalid expense';end if;
    if exists(select 1 from jsonb_array_elements_text(payload->'split') u where not exists(select 1 from public.trip_members m where m.trip_id=target_trip and m.user_id::text=u and m.invitation_state='accepted')) then raise exception 'Invalid expense split';end if;
   elsif kind_value='reservation' and (payload->>'endDate')::date<(payload->>'date')::date then raise exception 'Invalid reservation dates';
   end if;
   if kind_value='document' then
    file_path:=coalesce(payload->>'filePath','');
    if file_path<>'' and split_part(file_path,'/',1)<>actor::text and (not found_old or old.data->>'filePath' is distinct from file_path) then raise exception 'ACCESS: attachment owner mismatch';end if;
   end if;
  end if;
  insert into private.record_history(request_id,user_id,trip_id,previous) values(commit_travel_changes.request_id,actor,target_trip,case when found_old then to_jsonb(old) else '{}'::jsonb end);
  insert into public.travel_records(id,trip_id,kind,owner_id,visibility,version,deleted,data) values(target_id,target_trip,kind_value,owner_value,visibility_value,1,coalesce((item->>'deleted')::boolean,false),payload)
  on conflict(id) do update set visibility=excluded.visibility,version=travel_records.version+1,updated_at=now(),deleted=excluded.deleted,data=excluded.data;
 end loop;
 insert into private.mutation_receipts(user_id,request_id,trip_id) values(actor,request_id,target_trip);
end;$$;
revoke all on function public.commit_travel_changes(uuid,uuid,jsonb) from public,anon;
grant execute on function public.commit_travel_changes(uuid,uuid,jsonb) to authenticated;
create table private.trip_invites(code_hash text primary key,trip_id uuid not null references public.trips(id) on delete cascade,created_by uuid not null,expires timestamptz not null,used_by uuid);
create function public.create_trip_invite(target_trip uuid) returns text language plpgsql security definer set search_path='' as $$
declare code text:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
begin if not private.is_member(target_trip) then raise exception 'ACCESS';end if;
 insert into private.trip_invites values(md5(code),target_trip,auth.uid(),now()+interval '7 days',null);return code;end;$$;
create function public.accept_trip_invite(invite_code text) returns uuid language plpgsql security definer set search_path='' as $$
declare invite private.trip_invites%rowtype;actor uuid:=auth.uid();begin
 if actor is null then raise exception 'Authentication required';end if;
 select * into invite from private.trip_invites where code_hash=md5(invite_code) for update;
 if not found or invite.expires<now() or invite.used_by is not null then raise exception 'Convite inválido, usado ou expirado';end if;
 insert into public.trip_members(trip_id,user_id,display_name) select invite.trip_id,actor,name from public.users where id=actor on conflict do nothing;
 update private.trip_invites set used_by=actor where code_hash=invite.code_hash;return invite.trip_id;end;$$;
create function public.create_manual_trip(trip_name text,starts date,ends date,city_name text,tz text) returns uuid language plpgsql security definer set search_path='' as $$
declare tid uuid;actor uuid:=auth.uid();begin
 if actor is null then raise exception 'Authentication required';end if;
 if ends<starts or ends-starts>365 or length(trim(city_name))=0 or not exists(select 1 from pg_timezone_names where name=tz) then raise exception 'Invalid trip details';end if;
 insert into public.trips(name,start_date,end_date,created_by) values(trip_name,starts,ends,actor) returning id into tid;
 insert into public.trip_members(trip_id,user_id,display_name) select tid,actor,name from public.users where id=actor;
 insert into public.destinations(trip_id,city,country,start_date,end_date,timezone) values(tid,city_name,'',starts,ends,tz);return tid;end;$$;
create function public.update_trip_details(target_trip uuid,expected_version bigint,details jsonb) returns void language plpgsql security definer set search_path='' as $$
declare trip public.trips%rowtype;d jsonb;starts date:=(details->>'start_date')::date;ends date:=(details->>'end_date')::date;
begin
 if not private.is_member(target_trip) then raise exception 'ACCESS';end if;
 select * into trip from public.trips where id=target_trip for update;
 if trip.version<>expected_version then raise exception 'CONFLICT: a viagem foi alterada; atualize e tente novamente';end if;
 if ends<starts or ends-starts>365 or jsonb_array_length(details->'destinations') not between 1 and 100 then raise exception 'Invalid trip dates';end if;
 if exists(select 1 from public.travel_records where trip_id=target_trip and kind='activity' and not deleted and (data->>'date')::date not between starts and ends) then raise exception 'Existing activities outside dates';end if;
 update public.trips set name=details->>'name',cover=details->>'cover',currency=details->>'currency',pace=details->>'pace',start_date=starts,end_date=ends where id=target_trip;
 delete from public.destinations where trip_id=target_trip;
 for d in select * from jsonb_array_elements(details->'destinations') loop
  if (d->>'startDate')::date<starts or (d->>'endDate')::date>ends or not exists(select 1 from pg_timezone_names where name=d->>'timezone') then raise exception 'Invalid destination';end if;
  insert into public.destinations(id,trip_id,city,country,start_date,end_date,timezone,transport) values((d->>'id')::uuid,target_trip,d->>'city',d->>'country',(d->>'startDate')::date,(d->>'endDate')::date,d->>'timezone',array(select jsonb_array_elements_text(d->'transport')));
 end loop;
end;$$;
revoke all on function public.create_trip_invite(uuid),public.accept_trip_invite(text),public.create_manual_trip(text,date,date,text,text),public.update_trip_details(uuid,bigint,jsonb) from public,anon;
grant execute on function public.create_trip_invite(uuid),public.accept_trip_invite(text),public.create_manual_trip(text,date,date,text,text),public.update_trip_details(uuid,bigint,jsonb) to authenticated;
-- Private bucket: only the uploader can create an object. Reading shared files requires a readable document.
update storage.buckets set file_size_limit=10485760,allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp','text/plain'] where id='trip-private';
create policy attachment_insert on storage.objects for insert to authenticated with check(bucket_id='trip-private' and split_part(name,'/',1)=auth.uid()::text);
create policy attachment_read on storage.objects for select to authenticated using(bucket_id='trip-private' and (split_part(name,'/',1)=auth.uid()::text or exists(select 1 from public.travel_records r where r.kind='document' and not r.deleted and r.data->>'filePath'=name and private.is_member(r.trip_id) and (r.visibility='trip' or r.owner_id=auth.uid()))));
-- Refresh private-to-shared transitions via polling too: private transitions may not reach former readers through realtime RLS.
do $$ begin if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='travel_records') then alter publication supabase_realtime add table public.travel_records;end if;end;$$;
commit;
