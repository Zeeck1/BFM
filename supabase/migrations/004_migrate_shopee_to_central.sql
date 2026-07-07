-- ============================================================
-- BFM – Step 2: Migrate legacy shopee rows to central
-- Run AFTER 003_central_platform.sql has committed successfully
-- ============================================================

update public.search_cache
set platform = 'central'
where platform::text = 'shopee';

update public.orders
set platform = 'central'
where platform::text = 'shopee';

comment on type platform_type is
  'Supported marketplaces: central (Central Online), lazada (Lazada TH)';
