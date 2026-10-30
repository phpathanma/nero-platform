-- Ejecutar después de schema.sql en Supabase SQL Editor.
-- Da acceso administrativo a eventos y pedidos, y acceso limitado de puerta a tickets.

create or replace function public.has_control_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
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

create or replace function public.check_in_ticket(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ticket record;
  token_hash text;
begin
  if (select auth.uid()) is null
     or not public.has_control_role(array['admin','door_staff']) then
    return jsonb_build_object('status', 'unauthorized', 'message', 'Cuenta sin permisos de puerta.');
  end if;

  if p_token is null or length(p_token) < 8 or length(p_token) > 2048 then
    return jsonb_build_object('status', 'invalid', 'message', 'El código no es válido.');
  end if;

  token_hash := encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  select t.id, t.status as ticket_status, o.status as order_status,
         e.name as event_name, tt.name as tier_name, o.buyer_name
    into ticket
    from public.tickets t
    join public.orders o on o.id = t.order_id
    join public.events e on e.id = t.event_id
    join public.ticket_tiers tt on tt.id = t.tier_id
   where t.qr_token_hash = token_hash
   for update of t;

  if not found then
    return jsonb_build_object('status', 'invalid', 'message', 'No encontramos una entrada con ese código.');
  end if;

  if ticket.order_status <> 'paid' then
    return jsonb_build_object('status', 'not_paid', 'message', 'El pedido no tiene un pago confirmado.', 'event', ticket.event_name);
  end if;

  if ticket.ticket_status <> 'valid' then
    return jsonb_build_object('status', 'already_used', 'message', 'Esta entrada ya fue utilizada o cancelada.', 'event', ticket.event_name, 'tier', ticket.tier_name);
  end if;

  update public.tickets
     set status = 'used', used_at = now(), used_by = (select auth.uid())
   where id = ticket.id and status = 'valid';

  if not found then
    return jsonb_build_object('status', 'already_used', 'message', 'Esta entrada ya fue utilizada.', 'event', ticket.event_name);
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'ticket.checked_in', 'ticket', ticket.id,
          jsonb_build_object('event', ticket.event_name, 'tier', ticket.tier_name));

  return jsonb_build_object('status', 'valid', 'message', 'Acceso registrado correctamente.',
    'event', ticket.event_name, 'tier', ticket.tier_name, 'buyer', ticket.buyer_name);
end;
$$;

revoke all on function public.check_in_ticket(text) from public, anon;
grant execute on function public.check_in_ticket(text) to authenticated;

-- No se concede escritura desde el navegador para pedidos ni se permite a los usuarios asignarse roles.
