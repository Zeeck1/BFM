-- Smart Search access: admins always; other users only when granted by an admin.
-- Authorization uses public.can_use_smart_search(); the column is permission metadata.

alter table public.profiles
  add column if not exists smart_search_enabled boolean not null default false;

comment on column public.profiles.smart_search_enabled is
  'When true, a non-admin user may use Smart Search. Admins always may (see can_use_smart_search).';

create or replace function public.can_use_smart_search()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    auth.uid() is not null
    and (
      public.is_admin()
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.smart_search_enabled = true
      )
    );
$$;

revoke all on function public.can_use_smart_search() from public;
grant execute on function public.can_use_smart_search() to authenticated;

-- Keep admin rows easy to spot in the Users UI (optional display sync).
update public.profiles
set smart_search_enabled = true
where role = 'admin'
  and smart_search_enabled is distinct from true;
