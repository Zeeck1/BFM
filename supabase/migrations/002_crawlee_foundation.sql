-- ============================================================
-- BFM – Crawlee Foundation Schema Alignment
-- Run after 001_initial_schema.sql
-- ============================================================

-- ── orders: product_title + status enum alignment ────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'product_name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'product_title'
  ) then
    alter table public.orders rename column product_name to product_title;
  end if;
end $$;

-- Extend order_status for Crawlee foundation lifecycle labels
alter type order_status add value if not exists 'processing';
alter type order_status add value if not exists 'warehouse_bkk';

-- ── search_cache: ensure indexed lookup (idempotent) ─────────
create index if not exists idx_search_cache_keyword_platform
  on public.search_cache (keyword, platform, created_at desc);

comment on table public.search_cache is
  'Crawlee search results cache — rows older than 30 minutes are treated as stale by the API.';

comment on table public.orders is
  'Customer proxy-shopping orders submitted via OrderPlacementModal.';
