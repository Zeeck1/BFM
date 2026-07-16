-- Keep product-detail metadata available after a Lazada result is saved.
alter table public.saved_links
  add column if not exists shop_name text,
  add column if not exists review_count integer,
  add column if not exists average_score numeric(3, 2),
  add column if not exists sold_count bigint,
  add column if not exists product_colors text[],
  add column if not exists product_sizes text[];
