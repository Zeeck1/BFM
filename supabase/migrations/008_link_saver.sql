-- ============================================================
-- BFM – Link Saver (product wishlist)
-- Run after 007_app_credentials.sql
-- Safe to re-run (idempotent) — skips objects that already exist.
-- ============================================================

-- ── saved_links ─────────────────────────────────────────────
create table if not exists public.saved_links (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  url          text not null,
  title        text,
  description  text,
  image_url    text,
  price_thb    numeric(12, 2),
  price_mmk    numeric(16, 2),
  site_name    text,
  notes        text,
  created_at   timestamptz not null default now()
);

alter table public.saved_links add column if not exists title text;
alter table public.saved_links add column if not exists description text;
alter table public.saved_links add column if not exists image_url text;
alter table public.saved_links add column if not exists price_thb numeric(12, 2);
alter table public.saved_links add column if not exists price_mmk numeric(16, 2);
alter table public.saved_links add column if not exists site_name text;
alter table public.saved_links add column if not exists notes text;
alter table public.saved_links add column if not exists created_at timestamptz not null default now();

create unique index if not exists idx_saved_links_user_url
  on public.saved_links (user_id, url);

create index if not exists idx_saved_links_user_created
  on public.saved_links (user_id, created_at desc);

alter table public.saved_links enable row level security;

-- User policies — only create when missing (never error on re-run)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_links'
      and policyname = 'Users can view own saved links'
  ) then
    create policy "Users can view own saved links"
      on public.saved_links for select
      using ( auth.uid() = user_id );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_links'
      and policyname = 'Users can insert own saved links'
  ) then
    create policy "Users can insert own saved links"
      on public.saved_links for insert
      with check ( auth.uid() = user_id );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_links'
      and policyname = 'Users can update own saved links'
  ) then
    create policy "Users can update own saved links"
      on public.saved_links for update
      using ( auth.uid() = user_id );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_links'
      and policyname = 'Users can delete own saved links'
  ) then
    create policy "Users can delete own saved links"
      on public.saved_links for delete
      using ( auth.uid() = user_id );
  end if;
end;
$$;

-- ── orders: relax platform to free-text ──────────────────────
do $$
begin
  alter table public.orders
    alter column platform type text using platform::text;
  alter table public.orders
    alter column platform drop not null;
exception when others then
  null;
end;
$$;
