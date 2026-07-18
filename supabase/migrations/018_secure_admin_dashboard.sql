-- Secure admin access for the BFM dashboard.
-- The allow-list is the authorization source of truth; profiles.role is display metadata only.

create schema if not exists private;

create table if not exists private.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

insert into private.admin_allowlist (email)
values ('zwekhantko2019@gmail.com')
on conflict (email) do nothing;

alter table public.profiles add column if not exists email text;
create unique index if not exists idx_profiles_email
  on public.profiles (lower(email))
  where email is not null;

update public.profiles p
set email = lower(u.email)
from auth.users u
where p.id = u.id
  and (p.email is null or lower(p.email) <> lower(u.email));

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = private, public, pg_temp
as $$
  select exists (
    select 1
    from private.admin_allowlist
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_username text;
  v_role text;
begin
  v_username := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    nullif(split_part(new.email, '@', 1), '')
  );
  v_role := case
    when exists (
      select 1 from private.admin_allowlist
      where email = lower(coalesce(new.email, ''))
    ) then 'admin'
    else 'user'
  end;

  insert into public.profiles (id, email, username, role)
  values (new.id, lower(new.email), v_username, v_role)
  on conflict (id) do update
  set email = excluded.email,
      username = coalesce(public.profiles.username, excluded.username),
      role = excluded.role;

  return new;
end;
$$;

update public.profiles
set role = case
  when lower(email) in (select email from private.admin_allowlist) then 'admin'
  else 'user'
end;

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can view all orders" on public.orders;
create policy "Admins can view all orders"
  on public.orders for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can update all orders" on public.orders;
create policy "Admins can update all orders"
  on public.orders for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete all orders" on public.orders;
create policy "Admins can delete all orders"
  on public.orders for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can view all saved links" on public.saved_links;
create policy "Admins can view all saved links"
  on public.saved_links for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can update all saved links" on public.saved_links;
create policy "Admins can update all saved links"
  on public.saved_links for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete any saved link" on public.saved_links;
create policy "Admins can delete any saved link"
  on public.saved_links for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can view all shared lists" on public.shared_lists;
create policy "Admins can view all shared lists"
  on public.shared_lists for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can update all shared lists" on public.shared_lists;
create policy "Admins can update all shared lists"
  on public.shared_lists for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete all shared lists" on public.shared_lists;
create policy "Admins can delete all shared lists"
  on public.shared_lists for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can update exchange rates" on public.exchange_rates;
create policy "Admins can update exchange rates"
  on public.exchange_rates for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can insert exchange rates" on public.exchange_rates;
create policy "Admins can insert exchange rates"
  on public.exchange_rates for insert to authenticated
  with check ((select public.is_admin()));
