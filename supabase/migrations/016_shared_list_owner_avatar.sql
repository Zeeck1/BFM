-- 016: Add owner_avatar column to shared_lists for displaying the sharer's profile photo.

alter table public.shared_lists
  add column if not exists owner_avatar text;
