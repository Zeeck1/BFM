-- 011: Add 2-day expiration to shared_lists + auto-cleanup.

-- Add expires_at column (defaults to 2 days from now)
alter table public.shared_lists
  add column if not exists expires_at timestamptz not null default (now() + interval '2 days');

-- Update RLS select policy to only show non-expired lists
drop policy if exists "Anyone can view shared lists" on public.shared_lists;
create policy "Anyone can view shared lists" on public.shared_lists
  for select using (expires_at > now());

-- Cleanup function: delete expired rows
create or replace function public.cleanup_expired_shared_lists()
returns void
language sql
security definer
as $$
  delete from public.shared_lists where expires_at <= now();
$$;

-- Schedule auto-cleanup every hour (requires pg_cron extension).
-- If pg_cron is not enabled, run cleanup_expired_shared_lists() manually or via a cron job.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('cleanup_expired_shared_lists');
    perform cron.schedule(
      'cleanup_expired_shared_lists',
      '0 * * * *',
      'select public.cleanup_expired_shared_lists()'
    );
  end if;
end $$;
