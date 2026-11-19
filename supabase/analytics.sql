-- NERO: métricas (telemetría propia + embudo + atribución por ref).
-- Ejecutar SOLO en el proyecto de Supabase de NERO (jsyj…fayc), después de ticket-issuance.sql.
-- Se puede volver a ejecutar sin problema. No crea CRM, cumpleaños ni recaps.
--
-- Qué crea:
--   1. Columnas de atribución (ref, utm_source, utm_campaign) en public.tickets — ref_performance las necesita.
--   2. Tabla public.analytics_events: solo la escribe el servidor (service_role) tras validar y limitar.
--   3. Vistas de lectura (security_invoker: respetan el RLS de cada tabla; solo un admin ve datos):
--        event_funnel     – visitas → registros Free Access → check-ins por evento
--        ref_performance  – registros y check-ins por promotor/link (ref) y evento
--        ref_visits       – visitas por ref y evento
--        analytics_30d    – totales globales de los últimos 30 días

-- 1. Atribución en tickets ---------------------------------------------------------------
alter table public.tickets add column if not exists ref text;
alter table public.tickets add column if not exists utm_source text;
alter table public.tickets add column if not exists utm_campaign text;

alter table public.tickets drop constraint if exists tickets_attribution_format;
alter table public.tickets add constraint tickets_attribution_format check (
  (ref is null or ref ~ '^[a-z0-9_-]{1,60}$')
  and (utm_source is null or utm_source ~ '^[a-z0-9_-]{1,60}$')
  and (utm_campaign is null or utm_campaign ~ '^[a-z0-9_-]{1,60}$')
);
create index if not exists tickets_ref_idx on public.tickets (event_id, ref) where ref is not null;

-- 2. Telemetría -----------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  name text not null,
  path text,
  event_id uuid references public.events(id) on delete set null,
  session_id text,
  ref text,
  utm_source text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

-- Lista blanca de eventos de NERO (debe coincidir con lib/analytics.ts).
alter table public.analytics_events drop constraint if exists analytics_events_name_check;
alter table public.analytics_events add constraint analytics_events_name_check check (
  name in ('page_view', 'free_access_submit', 'whatsapp_click')
);
alter table public.analytics_events drop constraint if exists analytics_events_fields_check;
alter table public.analytics_events add constraint analytics_events_fields_check check (
  (path is null or char_length(path) <= 200)
  and (session_id is null or session_id ~ '^[a-z0-9]{8,40}$')
  and (ref is null or ref ~ '^[a-z0-9_-]{1,60}$')
  and (utm_source is null or utm_source ~ '^[a-z0-9_-]{1,60}$')
  and (utm_campaign is null or utm_campaign ~ '^[a-z0-9_-]{1,60}$')
);
create index if not exists analytics_events_name_time_idx on public.analytics_events (name, created_at desc);
create index if not exists analytics_events_event_idx on public.analytics_events (event_id, name);

alter table public.analytics_events enable row level security;
-- Nadie escribe desde el navegador: el endpoint usa service_role después de validar la lista blanca y el rate-limit.
revoke insert, update, delete on public.analytics_events from anon, authenticated;
grant select on public.analytics_events to authenticated;
grant all on public.analytics_events to service_role;
drop policy if exists "Admins can read analytics" on public.analytics_events;
create policy "Admins can read analytics" on public.analytics_events
for select to authenticated using (public.has_control_role(array['admin']));

-- 3. Vistas -----------------------------------------------------------------------------------
create or replace view public.event_funnel with (security_invoker = true) as
select
  e.id as event_id, e.slug, e.name, e.event_date, e.status,
  (select count(distinct a.session_id) from public.analytics_events a where a.event_id = e.id and a.name = 'page_view') as visits,
  (select count(*) from public.tickets t join public.orders o on o.id = t.order_id
     where t.event_id = e.id and o.source = 'free_access' and t.status <> 'cancelled') as registrations,
  (select count(*) from public.tickets t join public.orders o on o.id = t.order_id
     where t.event_id = e.id and o.source = 'free_access' and t.status = 'used') as checkins,
  (select count(*) from public.tickets t where t.event_id = e.id and t.status = 'used') as checkins_total,
  (select count(*) from public.analytics_events a where a.event_id = e.id and a.name = 'whatsapp_click') as whatsapp_clicks
from public.events e
where e.status <> 'draft';

create or replace view public.ref_performance with (security_invoker = true) as
select coalesce(t.ref, 'directo') as ref, t.event_id,
  count(*) as registrations,
  count(*) filter (where t.status = 'used') as checkins
from public.tickets t
join public.orders o on o.id = t.order_id
where o.source = 'free_access' and t.status <> 'cancelled'
group by 1, 2;

create or replace view public.ref_visits with (security_invoker = true) as
select coalesce(ref, 'directo') as ref, event_id, count(distinct session_id) as visits
from public.analytics_events
where name = 'page_view'
group by 1, 2;

create or replace view public.analytics_30d with (security_invoker = true) as
select
  count(distinct session_id) filter (where name = 'page_view') as visits,
  count(*) filter (where name = 'free_access_submit') as free_access_submits,
  count(*) filter (where name = 'whatsapp_click') as whatsapp_clicks
from public.analytics_events
where created_at > now() - interval '30 days';

revoke all on public.event_funnel, public.ref_performance, public.ref_visits, public.analytics_30d from anon;
grant select on public.event_funnel, public.ref_performance, public.ref_visits, public.analytics_30d to authenticated;
