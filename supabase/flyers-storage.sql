-- Ejecutar después de control-policies.sql. Se puede volver a ejecutar sin problema.
-- Crea el espacio público donde se guardan los afiches de los eventos.
-- Cualquiera puede ver los afiches; solo un administrador puede subirlos, cambiarlos o borrarlos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flyers', 'flyers', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload flyers" on storage.objects;
create policy "Admins can upload flyers" on storage.objects
for insert to authenticated
with check (bucket_id = 'flyers' and public.has_control_role(array['admin']));

drop policy if exists "Admins can update flyers" on storage.objects;
create policy "Admins can update flyers" on storage.objects
for update to authenticated
using (bucket_id = 'flyers' and public.has_control_role(array['admin']))
with check (bucket_id = 'flyers' and public.has_control_role(array['admin']));

drop policy if exists "Admins can delete flyers" on storage.objects;
create policy "Admins can delete flyers" on storage.objects
for delete to authenticated
using (bucket_id = 'flyers' and public.has_control_role(array['admin']));
