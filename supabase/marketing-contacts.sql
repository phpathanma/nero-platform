-- Ejecutar una vez en Supabase SQL Editor para habilitar la exportación de contactos.
-- Los pedidos existentes quedan sin consentimiento de marketing por defecto.
alter table public.orders add column if not exists buyer_phone text;
alter table public.orders add column if not exists marketing_consent boolean not null default false;

grant insert on public.audit_logs to authenticated;
drop policy if exists "Admins can record audit logs" on public.audit_logs;
create policy "Admins can record audit logs" on public.audit_logs
for insert to authenticated
with check (public.has_control_role(array['admin']));
