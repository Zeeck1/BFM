-- Record signed-in Lazada searches for the protected admin dashboard.
create table if not exists public.search_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null check (char_length(query) between 1 and 120),
  created_at timestamptz not null default now()
);

create index if not exists idx_search_events_user_created
  on public.search_events (user_id, created_at desc);

create index if not exists idx_search_events_query
  on public.search_events (lower(query));

alter table public.search_events enable row level security;

drop policy if exists "Users can record own searches" on public.search_events;
create policy "Users can record own searches"
  on public.search_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Admins can view all searches" on public.search_events;
create policy "Admins can view all searches"
  on public.search_events for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can delete searches" on public.search_events;
create policy "Admins can delete searches"
  on public.search_events for delete to authenticated
  using ((select public.is_admin()));
