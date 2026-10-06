-- SOMENTE em projeto de desenvolvimento depois das migrações 001–005.
-- Cria dados sintéticos dentro de uma transação, testa RLS e reverte tudo.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
('00000000-0000-4000-8000-000000000001','travel-os-a@example.test','{"name":"Teste A"}'),
('00000000-0000-4000-8000-000000000002','travel-os-b@example.test','{"name":"Teste B"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.create_demo_trip();
do $$begin
 if (select count(*) from public.trips)<>1 then raise exception 'A deve enxergar sua viagem';end if;
 if (select count(*) from public.users)<>1 then raise exception 'Perfil deve ser privado';end if;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.trips) then raise exception 'B não pode enxergar viagem de A';end if;
 if exists(select 1 from public.destinations) then raise exception 'B não pode enxergar destinos de A';end if;
 if exists(select 1 from public.trip_members) then raise exception 'B não pode enxergar membros de A';end if;
end$$;
reset role;
insert into public.trip_members(trip_id,user_id,display_name)
select id,'00000000-0000-4000-8000-000000000002','Teste B' from public.trips where created_by='00000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$begin
 if (select count(*) from public.trips)<>1 then raise exception 'B participante deve enxergar a viagem';end if;
 perform public.commit_travel_changes(gen_random_uuid(),(select id from public.trips limit 1),jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'expected',null,'kind','note','owner_id',auth.uid(),'visibility','trip','deleted',false,'data',jsonb_build_object('title','Teste colaborativo','date','2027-01-22','notes','Nota sintética'))));
 if not exists(select 1 from public.travel_records where data->>'title'='Teste colaborativo' and version=1) then raise exception 'B deve poder criar conteúdo compartilhado';end if;
end$$;
reset role;
rollback;
