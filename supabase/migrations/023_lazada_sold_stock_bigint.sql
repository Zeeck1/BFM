-- Lazada feed sometimes returns sold/stock values beyond int4 (e.g. 200000000000).
alter table public.lazada_products
  alter column sold_count type bigint using sold_count::bigint,
  alter column stock type bigint using stock::bigint;
