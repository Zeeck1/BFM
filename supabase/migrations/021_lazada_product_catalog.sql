-- Lazada Affiliate product catalog for BFM search engine.
-- Populated by daily sync from /marketing/product/feed (service role only).

create extension if not exists pg_trgm;

create table if not exists public.lazada_products (
  product_id text primary key,
  title text not null default '',
  product_url text not null,
  image_url text,
  price_thb numeric(14, 2),
  shop_name text,
  brand_name text,
  category_l1 bigint,
  sold_count integer,
  stock integer,
  out_of_stock boolean not null default false,
  offer_type integer not null default 1,
  currency text default 'THB',
  raw jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_lazada_products_title_trgm
  on public.lazada_products using gin (title gin_trgm_ops);

create index if not exists idx_lazada_products_category
  on public.lazada_products (category_l1);

create index if not exists idx_lazada_products_price
  on public.lazada_products (price_thb);

create index if not exists idx_lazada_products_sold
  on public.lazada_products (sold_count desc nulls last);

create index if not exists idx_lazada_products_synced
  on public.lazada_products (synced_at desc);

create table if not exists public.lazada_feed_sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('running', 'success', 'failed')),
  offer_type integer not null default 1,
  pages_fetched integer not null default 0,
  products_upserted integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_lazada_feed_sync_runs_started
  on public.lazada_feed_sync_runs (started_at desc);

alter table public.lazada_products enable row level security;
alter table public.lazada_feed_sync_runs enable row level security;

-- No anon/authenticated policies: read/write only via service role (Node API).
