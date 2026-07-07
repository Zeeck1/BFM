-- 010: Shared lists — public snapshots of selected wishlist items for QR sharing.

create table if not exists public.shared_lists (
  id         text primary key,                              -- short random ID (nanoid-style)
  user_id    uuid not null references auth.users(id) on delete cascade,
  items      jsonb not null default '[]'::jsonb,            -- snapshot of selected SavedLink[]
  owner_name text,                                          -- display name of the user who shared
  created_at timestamptz not null default now()
);

-- Anyone can read (public page), only the owner can insert.
alter table public.shared_lists enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Anyone can view shared lists' and tablename = 'shared_lists') then
    create policy "Anyone can view shared lists" on public.shared_lists for select using (true);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can create own shared lists' and tablename = 'shared_lists') then
    create policy "Users can create own shared lists" on public.shared_lists for insert with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_shared_lists_user on public.shared_lists(user_id);
