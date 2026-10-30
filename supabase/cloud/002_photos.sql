-- Foravento: fotos entre aparelhos. Rode depois de 001_sync.sql, uma vez, inteiro.
-- Os dados da foto (legenda, data, local) viajam como registros do tipo "photo".
-- Os arquivos ficam num espaço privado, numa pasta por viagem: <viagem>/<foto>.jpg

-- Converte o início do caminho em uuid sem dar erro quando não for um.
create function public.cloud_path_trip(path text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return (string_to_array(path, '/'))[1]::uuid;
exception when others then
  return null;
end;
$$;
grant execute on function public.cloud_path_trip(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-photos', 'trip-photos', false, 8388608, array['image/jpeg'])
on conflict (id) do nothing;

create policy trip_photos_read on storage.objects
  for select to authenticated
  using (bucket_id = 'trip-photos'
         and public.is_cloud_member(public.cloud_path_trip(name)));
create policy trip_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'trip-photos'
              and public.is_cloud_member(public.cloud_path_trip(name)));
create policy trip_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'trip-photos'
         and public.is_cloud_member(public.cloud_path_trip(name)))
  with check (bucket_id = 'trip-photos'
              and public.is_cloud_member(public.cloud_path_trip(name)));
create policy trip_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'trip-photos'
         and public.is_cloud_member(public.cloud_path_trip(name)));
