-- Persist user avatars on public profiles so authorized admins can display them.
-- Avatar URLs are presentation data only; never use them for authorization.

alter table public.profiles
  add column if not exists avatar_url text;

-- Populate avatars for existing OAuth users where an avatar URL is already present.
update public.profiles p
set avatar_url = coalesce(
  nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
  nullif(u.raw_user_meta_data ->> 'picture', '')
)
from auth.users u
where p.id = u.id
  and p.avatar_url is null
  and coalesce(
    nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(u.raw_user_meta_data ->> 'picture', '')
  ) is not null;

-- Keep the signup trigger's profile data complete for new users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_username text;
  v_role text;
  v_avatar_url text;
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
  v_avatar_url := coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'picture', '')
  );

  insert into public.profiles (id, email, username, role, avatar_url)
  values (new.id, lower(new.email), v_username, v_role, v_avatar_url)
  on conflict (id) do update
  set email = excluded.email,
      username = coalesce(public.profiles.username, excluded.username),
      role = excluded.role,
      avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;
