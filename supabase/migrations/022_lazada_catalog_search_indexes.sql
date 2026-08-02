-- Extra trigram indexes for lean catalog search (brand / shop).

create index if not exists idx_lazada_products_brand_trgm
  on public.lazada_products using gin (brand_name gin_trgm_ops);

create index if not exists idx_lazada_products_shop_trgm
  on public.lazada_products using gin (shop_name gin_trgm_ops);
