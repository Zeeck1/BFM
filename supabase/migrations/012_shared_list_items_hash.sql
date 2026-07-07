-- 012: Add items_hash for deduplication of shared lists.

alter table public.shared_lists
  add column if not exists items_hash text;

create index if not exists idx_shared_lists_hash
  on public.shared_lists(user_id, items_hash);
