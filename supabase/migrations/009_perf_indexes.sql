-- ============================================================
-- BFM – Performance optimisations
-- Adds missing indexes, drops unused tables, vacuums bloat.
-- ============================================================

-- ── Drop unused search_cache table ───────────────────────────
-- The search feature was removed; this table is just CPU/storage waste.
drop table if exists public.search_cache cascade;

-- ── orders: index on user_id (used by every RLS check) ───────
create index if not exists idx_orders_user_id
  on public.orders (user_id);

create index if not exists idx_orders_user_status
  on public.orders (user_id, status, created_at desc);

-- ── exchange_rates: only ever 1 row; ensure primary key is used ──
-- Already has serial pk — nothing extra needed. Ensure we select by id DESC
-- so Postgres uses the index scan instead of seqscan.

-- ── profiles: index on id is already the PK, but username lookup ──
create index if not exists idx_profiles_id
  on public.profiles (id);

-- ── saved_links: narrow index for the update/delete by id ────
create index if not exists idx_saved_links_id
  on public.saved_links (id);

-- NOTE: VACUUM cannot run inside a transaction block (which Supabase SQL Editor uses).
-- After this migration runs, execute these separately in the SQL Editor one at a time:
--
--   VACUUM ANALYZE public.saved_links;
--   VACUUM ANALYZE public.orders;
--   VACUUM ANALYZE public.profiles;
--   VACUUM ANALYZE public.exchange_rates;
