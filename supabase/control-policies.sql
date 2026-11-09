-- Ejecutar después de schema.sql en Supabase SQL Editor.
-- Da acceso administrativo a eventos y pedidos, y acceso limitado de puerta a tickets.

create or replace function public.has_control_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = any(required_roles)
  );
$$;

revoke all on function public.has_control_role(text[]) from public, anon;
grant execute on function public.has_control_role(text[]) to authenticated;

grant select, insert, update, delete on public.events, public.ticket_tiers to authenticated;
grant select on public.profiles, public.orders, public.tickets, public.audit_logs to authenticated;
grant insert on public.audit_logs to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.has_control_role(array['admin']));

drop policy if exists "Staff can read all events" on public.events;
create policy "Staff can read all events" on public.events
for select to authenticated
using (public.has_control_role(array['admin','door_staff']));

drop policy if exists "Admins can manage events" on public.events;
create policy "Admins can manage events" on public.events
for all to authenticated
using (public.has_control_role(array['admin']))
with check (public.has_control_role(array['admin']));

drop policy if exists "Staff can read all ticket tiers" on public.ticket_tiers;
create policy "Staff can read all ticket tiers" on public.ticket_tiers
for select to authenticated
using (public.has_control_role(array['admin','door_staff']));

drop policy if exists "Admins can manage ticket tiers" on public.ticket_tiers;
create policy "Admins can manage ticket tiers" on public.ticket_tiers
for all to authenticated
using (public.has_control_role(array['admin']))
with check (public.has_control_role(array['admin']));

drop policy if exists "Admins can read orders" on public.orders;
create policy "Admins can read orders" on public.orders
for select to authenticated
using (public.has_control_role(array['admin']));

drop policy if exists "Staff can read tickets" on public.tickets;
create policy "Staff can read tickets" on public.tickets
for select to authenticated
using (public.has_control_role(array['admin','door_staff']));

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs" on public.audit_logs
for select to authenticated
using (public.has_control_role(array['admin']));

drop policy if exists "Admins can record audit logs" on public.audit_logs;
create policy "Admins can record audit logs" on public.audit_logs
for insert to authenticated
with check (public.has_control_role(array['admin']));

-- No se concede escritura desde el navegador para pedidos ni se permite a los usuarios asignarse roles.
