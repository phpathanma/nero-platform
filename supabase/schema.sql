-- NERO CORE: esquema inicial. Ejecutar en Supabase SQL Editor.
create extension if not exists pgcrypto;

create type public.event_status as enum ('draft', 'published', 'past');

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tag text default '',
  event_date date not null,
  event_time time not null,
  venue text default 'Por confirmar',
  city text not null,
  status public.event_status not null default 'draft',
  accent text default '#e8e8e8',
  background text default '#171717',
  flyer_url text,
  lineup text[] not null default '{}',
  schedule text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category text not null default 'custom',
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  capacity integer not null check (capacity >= 0),
  sold integer not null default 0 check (sold >= 0),
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'customer' check (role in ('customer','admin','door_staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  event_id uuid not null references public.events(id),
  status text not null default 'pending' check (status in ('pending','paid','confirmed','cancelled','refunded')),
  source text not null default 'sale' check (source in ('sale','free_access','courtesy')),
  buyer_name text not null,
  buyer_phone text,
  buyer_email text not null,
  marketing_consent boolean not null default false,
  total numeric(10,2) not null check (total >= 0),
  payment_provider text,
  provider_reference text,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists buyer_phone text;
alter table public.orders add column if not exists marketing_consent boolean not null default false;
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
alter table public.orders add constraint orders_status_check check (status in ('pending','paid','confirmed','cancelled','refunded'));
alter table public.ticket_tiers drop constraint if exists ticket_tiers_category_check;
alter table public.ticket_tiers add constraint ticket_tiers_category_check check (category in ('free_access','ga_10pm','ga_all_night','vip','dj_booth','custom'));
create unique index if not exists ticket_tiers_event_category_unique
  on public.ticket_tiers(event_id, category) where category <> 'custom';
create unique index if not exists orders_one_free_access_per_email
  on public.orders(event_id, lower(btrim(buyer_email)))
  where source = 'free_access' and status <> 'cancelled';

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_id uuid not null references public.events(id),
  tier_id uuid not null references public.ticket_tiers(id),
  qr_token_hash text unique not null,
  status text not null default 'valid' check (status in ('valid','used','cancelled')),
  used_at timestamptz,
  used_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
alter table public.ticket_tiers enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;
alter table public.audit_logs enable row level security;

-- Lectura pública únicamente de eventos publicados y sus tipos de entrada.
create policy "Public can read published events" on public.events
for select using (status = 'published' or status = 'past');

create policy "Public can read tiers for public events" on public.ticket_tiers
for select using (exists (
  select 1 from public.events e
  where e.id = event_id and e.status in ('published','past')
));

-- Los datos privados no tienen políticas públicas de lectura/escritura.
-- Añadir políticas específicas para admin/door_staff antes de habilitar el panel.
-- Las compras y validaciones deben pasar por funciones/endpoints de servidor
-- que verifiquen pagos, stock, roles y uso único del QR.
