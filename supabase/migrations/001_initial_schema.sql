-- ============================================================
-- BFM – Buy For Me | Initial Database Schema
-- Run this in the Supabase SQL Editor (or via supabase db push)
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Custom Types ─────────────────────────────────────────────
create type order_status as enum (
  'pending',
  'paid',
  'purchasing',
  'received_at_bkk',
  'in_transit',
  'delivered'
);

create type platform_type as enum ('lazada');

-- ── profiles ─────────────────────────────────────────────────
-- Extends Supabase auth.users with customer-specific fields.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  address     text,
  created_at  timestamptz not null default now()
);

-- Automatically create a profile row when a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS: users can only read/edit their own profile.
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- ── search_cache ─────────────────────────────────────────────
-- Stores Apify scraping results keyed by (keyword, platform).
-- The application treats any row older than 30 minutes as stale.
create table if not exists public.search_cache (
  id          uuid primary key default uuid_generate_v4(),
  keyword     text not null,
  platform    platform_type not null,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_search_cache_lookup
  on public.search_cache (keyword, platform, created_at desc);

-- RLS: allow Edge Functions (service role) full access;
--      authenticated users may read cache entries.
alter table public.search_cache enable row level security;

create policy "Authenticated users can read cache"
  on public.search_cache for select
  to authenticated
  using ( true );

-- Service-role key (used by Edge Functions) bypasses RLS by default,
-- so no explicit service-role policy is required for insert/delete.

-- ── orders ───────────────────────────────────────────────────
-- Each row represents one "Request to Buy" submitted by a customer.
create table if not exists public.orders (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  product_name    text not null,
  original_url    text not null,
  platform        platform_type not null,
  price_thb       numeric(12, 2) not null,
  price_mmk       numeric(16, 2) not null,
  cargo_fee_mmk   numeric(16, 2) not null default 0,
  status          order_status not null default 'pending',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Keep updated_at fresh on every write.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

-- RLS: users can only access their own orders.
alter table public.orders enable row level security;

create policy "Users can view own orders"
  on public.orders for select
  using ( auth.uid() = user_id );

create policy "Users can insert own orders"
  on public.orders for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own orders"
  on public.orders for update
  using ( auth.uid() = user_id );

-- ── exchange_rates ───────────────────────────────────────────
-- Admin-controlled THB → MMK rate table (single active row pattern).
create table if not exists public.exchange_rates (
  id          serial primary key,
  thb_to_mmk  numeric(10, 4) not null default 110,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id)
);

-- Seed the initial rate so the app always has a value to read.
insert into public.exchange_rates (thb_to_mmk)
values (110)
on conflict do nothing;

-- RLS: anyone can read the rate; only service role can update it.
alter table public.exchange_rates enable row level security;

create policy "Anyone can read exchange rates"
  on public.exchange_rates for select
  using ( true );
