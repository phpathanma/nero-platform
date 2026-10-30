-- Ejecutar después de schema.sql y control-policies.sql.
-- Emite Free Access y cortesías de forma atómica; nunca guarda el QR en claro.

alter table public.ticket_tiers add column if not exists category text not null default 'custom';
with ranked_legacy_tiers as (
  select id, case upper(btrim(name))
    when 'FREE ACCESS' then 'free_access'
    when 'GA 10PM' then 'ga_10pm'
    when 'GA ALL NIGHT' then 'ga_all_night'
    when 'VIP' then 'vip'
    when 'DJ BOOTH' then 'dj_booth'
    else 'custom' end as mapped_category,
    row_number() over (partition by event_id, upper(btrim(name)) order by created_at, id) as duplicate_rank
  from public.ticket_tiers where category = 'custom'
)
update public.ticket_tiers as tiers set category = case
  when ranked.duplicate_rank = 1 then ranked.mapped_category else 'custom' end
from ranked_legacy_tiers as ranked where tiers.id = ranked.id;
alter table public.ticket_tiers drop constraint if exists ticket_tiers_sold_within_capacity;
alter table public.ticket_tiers add constraint ticket_tiers_sold_within_capacity check (sold <= capacity) not valid;
alter table public.orders add column if not exists source text not null default 'sale';
alter table public.orders drop constraint if exists orders_source_check;
alter table public.orders add constraint orders_source_check check (source in ('sale','free_access','courtesy'));
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending','paid','confirmed','cancelled','refunded'));
alter table public.ticket_tiers drop constraint if exists ticket_tiers_category_check;
alter table public.ticket_tiers add constraint ticket_tiers_category_check
  check (category in ('free_access','ga_10pm','ga_all_night','vip','dj_booth','custom'));

create unique index if not exists ticket_tiers_event_category_unique
  on public.ticket_tiers(event_id, category) where category <> 'custom';
create unique index if not exists orders_one_free_access_per_email
  on public.orders(event_id, lower(btrim(buyer_email)))
  where source = 'free_access' and status <> 'cancelled';

create or replace function public.issue_free_access_ticket(
  p_tier_id uuid,
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_phone text,
  p_marketing_consent boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  tier record;
  order_id uuid;
  ticket_id uuid;
  token text;
begin
  if p_buyer_name is null or length(trim(p_buyer_name)) < 2 or length(p_buyer_name) > 120
     or p_buyer_email is null or length(trim(p_buyer_email)) > 254
     or trim(p_buyer_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
     or p_buyer_phone is null or length(trim(p_buyer_phone)) < 7 or length(p_buyer_phone) > 30 then
    return jsonb_build_object('status','invalid','message','Revisa el nombre, correo y teléfono.');
  end if;

  select tt.id, tt.event_id, tt.category, tt.name, tt.price, tt.capacity, tt.sold,
         tt.sale_starts_at, tt.sale_ends_at, e.name as event_name, e.status as event_status,
         e.event_date,e.event_time,e.venue,e.city
    into tier
    from public.ticket_tiers tt
    join public.events e on e.id = tt.event_id
   where tt.id = p_tier_id
   for update of tt;

  if not found then
    return jsonb_build_object('status','unavailable','message','Free Access no está disponible.');
  end if;
  if tier.category <> 'free_access' or tier.price <> 0 then
    return jsonb_build_object('status','unavailable','message','Free Access no está disponible.');
  end if;
  if tier.event_status <> 'published'
     or (tier.sale_starts_at is not null and tier.sale_starts_at > now())
     or (tier.sale_ends_at is not null and tier.sale_ends_at <= now()) then
    return jsonb_build_object('status','unavailable','message','La emisión de Free Access no está habilitada en este momento.');
  end if;

  begin
    update public.ticket_tiers
       set sold = sold + 1
     where id = tier.id and sold < capacity
       and (sale_starts_at is null or sale_starts_at <= now())
       and (sale_ends_at is null or sale_ends_at > now());
    if not found then
      return jsonb_build_object('status','sold_out','message','Free Access ya alcanzó su cupo.');
    end if;

    insert into public.orders(event_id,status,source,buyer_name,buyer_email,buyer_phone,marketing_consent,total)
    values (tier.event_id,'confirmed','free_access',trim(p_buyer_name),lower(trim(p_buyer_email)),trim(p_buyer_phone),coalesce(p_marketing_consent,false),0)
    returning id into order_id;

    token := replace(pg_catalog.gen_random_uuid()::text,'-','') || replace(pg_catalog.gen_random_uuid()::text,'-','');
    insert into public.tickets(order_id,event_id,tier_id,qr_token_hash)
    values (order_id,tier.event_id,tier.id,encode(pg_catalog.sha256(pg_catalog.convert_to(token,'UTF8')),'hex'))
    returning id into ticket_id;

    insert into public.audit_logs(action,entity_type,entity_id,metadata)
    values ('ticket.free_access_issued','ticket',ticket_id,jsonb_build_object('event_id',tier.event_id,'tier_id',tier.id));
  exception when unique_violation then
    return jsonb_build_object('status','already_issued','message','Ya se emitió una entrada Free Access para este correo en este evento.');
  end;

  return jsonb_build_object('status','issued','token',token,'ticket_id',ticket_id,'event_id',tier.event_id,'tier',tier.name,'event',tier.event_name,'date',tier.event_date,'time',tier.event_time,'venue',tier.venue,'city',tier.city);
end;
$$;

revoke all on function public.issue_free_access_ticket(uuid,text,text,text,boolean) from public;
grant execute on function public.issue_free_access_ticket(uuid,text,text,text,boolean) to anon, authenticated;

create or replace function public.issue_courtesy_ticket(
  p_tier_id uuid,
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_phone text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  tier record;
  order_id uuid;
  ticket_id uuid;
  token text;
begin
  if (select auth.uid()) is null or not public.has_control_role(array['admin']) then
    return jsonb_build_object('status','unauthorized','message','Solo un administrador puede emitir cortesías.');
  end if;
  if p_buyer_name is null or length(trim(p_buyer_name)) < 2 or length(p_buyer_name) > 120
     or p_buyer_email is null or length(trim(p_buyer_email)) > 254
     or trim(p_buyer_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
     or p_buyer_phone is null or length(trim(p_buyer_phone)) < 7 or length(p_buyer_phone) > 30
     or length(coalesce(p_reason,'')) > 300 then
    return jsonb_build_object('status','invalid','message','Revisa los datos del invitado y el motivo.');
  end if;

  select tt.id,tt.event_id,tt.name,tt.capacity,tt.sold,e.name as event_name,e.status as event_status,
         e.event_date,e.event_time,e.venue,e.city
    into tier from public.ticket_tiers tt join public.events e on e.id=tt.event_id
   where tt.id=p_tier_id for update of tt;
  if not found then
    return jsonb_build_object('status','unavailable','message','El tipo de entrada no está disponible para cortesías.');
  end if;
  if tier.event_status='past' then
    return jsonb_build_object('status','unavailable','message','El tipo de entrada no está disponible para cortesías.');
  end if;

  update public.ticket_tiers set sold=sold+1 where id=tier.id and sold<capacity;
  if not found then
    return jsonb_build_object('status','sold_out','message','Este tipo de entrada ya alcanzó su cupo.');
  end if;

  insert into public.orders(event_id,status,source,buyer_name,buyer_email,buyer_phone,total)
  values(tier.event_id,'confirmed','courtesy',trim(p_buyer_name),lower(trim(p_buyer_email)),trim(p_buyer_phone),0)
  returning id into order_id;
  token:=replace(pg_catalog.gen_random_uuid()::text,'-','') || replace(pg_catalog.gen_random_uuid()::text,'-','');
  insert into public.tickets(order_id,event_id,tier_id,qr_token_hash)
  values(order_id,tier.event_id,tier.id,encode(pg_catalog.sha256(pg_catalog.convert_to(token,'UTF8')),'hex'))
  returning id into ticket_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values((select auth.uid()),'ticket.courtesy_issued','ticket',ticket_id,
         jsonb_build_object('event_id',tier.event_id,'tier_id',tier.id,'reason',nullif(trim(coalesce(p_reason,'')),'')));

  return jsonb_build_object('status','issued','token',token,'ticket_id',ticket_id,'event_id',tier.event_id,'tier',tier.name,'event',tier.event_name,'date',tier.event_date,'time',tier.event_time,'venue',tier.venue,'city',tier.city);
end;
$$;

revoke all on function public.issue_courtesy_ticket(uuid,text,text,text,text) from public;
grant execute on function public.issue_courtesy_ticket(uuid,text,text,text,text) to authenticated;

create or replace function public.get_ticket_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  ticket record;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status','invalid','message','El código de entrada no es válido.');
  end if;
  select t.status as ticket_status,o.status as order_status,o.source,o.buyer_name,
         e.name as event_name,e.event_date,e.event_time,e.venue,e.city,tt.name as tier_name
    into ticket
    from public.tickets t join public.orders o on o.id=t.order_id
    join public.events e on e.id=t.event_id join public.ticket_tiers tt on tt.id=t.tier_id
   where t.qr_token_hash=encode(pg_catalog.sha256(pg_catalog.convert_to(p_token,'UTF8')),'hex');
  if not found then return jsonb_build_object('status','invalid','message','No encontramos esta entrada.'); end if;
  if ticket.ticket_status='cancelled' or ticket.order_status='cancelled' or ticket.order_status='refunded' then
    return jsonb_build_object('status','cancelled','message','Esta entrada fue cancelada.');
  end if;
  if not (ticket.order_status='paid' or
      (ticket.order_status='confirmed' and ticket.source in ('free_access','courtesy'))) then
    return jsonb_build_object('status','pending','message','El pedido todavía no está confirmado.');
  end if;
  return jsonb_build_object('status',ticket.ticket_status,'source',ticket.source,'name',ticket.buyer_name,
    'event',ticket.event_name,'date',ticket.event_date,'time',ticket.event_time,
    'venue',ticket.venue,'city',ticket.city,'tier',ticket.tier_name);
end;
$$;

revoke all on function public.get_ticket_by_token(text) from public;
grant execute on function public.get_ticket_by_token(text) to anon, authenticated;

create or replace function public.check_in_ticket(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  ticket record;
  token_hash text;
begin
  if (select auth.uid()) is null or not public.has_control_role(array['admin','door_staff']) then
    return jsonb_build_object('status','unauthorized','message','Cuenta sin permisos de puerta.');
  end if;
  if p_token is null or length(p_token) <> 64 or p_token !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status','invalid','message','El código no es válido.');
  end if;
  token_hash:=encode(pg_catalog.sha256(pg_catalog.convert_to(p_token,'UTF8')),'hex');
  select t.id,t.status as ticket_status,o.status as order_status,o.total as order_total,o.source,
         e.name as event_name,tt.name as tier_name,o.buyer_name
    into ticket
    from public.tickets t join public.orders o on o.id=t.order_id
    join public.events e on e.id=t.event_id join public.ticket_tiers tt on tt.id=t.tier_id
   where t.qr_token_hash=token_hash for update of t;
  if not found then return jsonb_build_object('status','invalid','message','No encontramos una entrada con ese código.'); end if;
  if not (ticket.order_status='paid' or
      (ticket.order_status='confirmed' and ticket.order_total=0 and ticket.source in ('free_access','courtesy'))) then
    return jsonb_build_object('status','not_paid','message','El pedido no tiene confirmación válida.','event',ticket.event_name);
  end if;
  if ticket.ticket_status<>'valid' then
    return jsonb_build_object('status','already_used','message','Esta entrada ya fue utilizada o cancelada.','event',ticket.event_name,'tier',ticket.tier_name);
  end if;
  update public.tickets set status='used',used_at=now(),used_by=(select auth.uid()) where id=ticket.id and status='valid';
  if not found then return jsonb_build_object('status','already_used','message','Esta entrada ya fue utilizada.','event',ticket.event_name); end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values((select auth.uid()),'ticket.checked_in','ticket',ticket.id,jsonb_build_object('event',ticket.event_name,'tier',ticket.tier_name));
  return jsonb_build_object('status','valid','message','Entrada válida. Acceso registrado.','event',ticket.event_name,'tier',ticket.tier_name,'buyer',ticket.buyer_name);
end;
$$;

revoke all on function public.check_in_ticket(text) from public,anon;
grant execute on function public.check_in_ticket(text) to authenticated;
