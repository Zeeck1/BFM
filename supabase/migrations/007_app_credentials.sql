-- ============================================================
-- BFM – App credentials (username + password, server-verified)
-- Run after 006_username_auth.sql
-- ============================================================

create table if not exists public.app_credentials (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  username       text not null,
  password_hash  text not null,
  created_at     timestamptz not null default now()
);

create unique index if not exists idx_app_credentials_username
  on public.app_credentials (lower(username));

create unique index if not exists idx_app_credentials_user
  on public.app_credentials (user_id);

alter table public.app_credentials enable row level security;

-- No client policies — only service role may access this table.
