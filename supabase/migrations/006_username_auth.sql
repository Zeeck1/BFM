-- ============================================================
-- BFM – Username/password auth (profiles.username + role)
-- Run after 005_saved_links.sql
-- ============================================================

alter table public.profiles
  add column if not exists username text,
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'user'));

create unique index if not exists idx_profiles_username
  on public.profiles (lower(username))
  where username is not null;

-- Backfill username from auth email prefix for existing users
update public.profiles p
set username = split_part(u.email, '@', 1)
from auth.users u
where p.id = u.id
  and p.username is null
  and u.email like '%@%';

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_role text;
begin
  v_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(split_part(new.email, '@', 1), '')
  );
  v_role := coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'user');

  insert into public.profiles (id, username, role)
  values (new.id, v_username, v_role);

  return new;
end;
$$;

-- Admin can view all profiles (user management)
create policy "Admins can view all profiles"
  on public.profiles for select
  using ( public.is_admin() or auth.uid() = id );

-- Admin visibility for orders and saved links
create policy "Admins can view all orders"
  on public.orders for select
  using ( public.is_admin() or auth.uid() = user_id );

create policy "Admins can view all saved links"
  on public.saved_links for select
  using ( public.is_admin() or auth.uid() = user_id );

create policy "Admins can delete any saved link"
  on public.saved_links for delete
  using ( public.is_admin() or auth.uid() = user_id );
