begin;
create or replace function public.create_demo_trip() returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();tid uuid;begin
 if actor is null then raise exception 'Authentication required';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select id into tid from public.trips where created_by=actor and is_demo=true limit 1;
 if tid is not null then return tid;end if;
 insert into public.trips(name,start_date,end_date,created_by,is_demo) values('USA 2027','2027-01-20','2027-02-07',actor,true) returning id into tid;
 insert into public.trip_members(trip_id,user_id,display_name) select tid,actor,name from public.users where id=actor;
 insert into public.destinations(trip_id,city,country,start_date,end_date,timezone,transport) values
 (tid,'Los Angeles','Estados Unidos','2027-01-20','2027-01-25','America/Los_Angeles',array['car']),
 (tid,'Las Vegas','Estados Unidos','2027-01-26','2027-01-29','America/Los_Angeles',array['car']),
 (tid,'Orlando','Estados Unidos','2027-01-30','2027-02-07','America/New_York',array['car']);return tid;
end;$$;
-- Preserve existing trips and user changes; enrich only an untouched foundation demo.
insert into public.destinations(trip_id,city,country,start_date,end_date,timezone,transport)
select t.id,v.city,'Estados Unidos',v.starts::date,v.ends::date,v.tz,array['car'] from public.trips t cross join (values('Las Vegas','2027-01-26','2027-01-29','America/Los_Angeles'),('Orlando','2027-01-30','2027-02-07','America/New_York')) v(city,starts,ends,tz)
where t.is_demo and t.start_date='2027-01-20' and t.end_date='2027-02-07' and exists(select 1 from public.destinations d where d.trip_id=t.id and d.city='Los Angeles' and d.end_date='2027-02-07') and not exists(select 1 from public.destinations d where d.trip_id=t.id and d.city=v.city);
update public.destinations d set end_date='2027-01-25' from public.trips t where t.id=d.trip_id and t.is_demo and d.city='Los Angeles' and d.end_date='2027-02-07' and exists(select 1 from public.destinations x where x.trip_id=t.id and x.city='Las Vegas');
commit;
