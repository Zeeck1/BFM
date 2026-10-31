-- BFM Points: 1 point = 1 Thai Baht (THB), stored with 2 decimals (satang precision).
--
-- Security model
--   * profiles.points can NEVER be written directly by the browser (anon/authenticated),
--     not even by admins. A trigger rejects any such change.
--   * The only write path is public.admin_adjust_points(), a SECURITY DEFINER RPC that
--     checks public.is_admin() (email allow-list), validates input, locks the row,
--     applies optimistic concurrency, and writes an append-only audit ledger row in the
--     same transaction.
--   * public.point_transactions is append-only: no client insert/update/delete grants,
--     and a trigger blocks UPDATE for everyone.
--   * Users can read only their own balance and ledger; admins can read all.
--   * The same trigger also closes a pre-existing hole where users could grant themselves
--     smart_search_enabled / role via the "update own profile" policy.

-- ── Balance column ───────────────────────────────────────────
alter table public.profiles
  add column if not exists points numeric(14, 2) not null default 0;

-- Normalise in case an earlier draft created the column with another type.
update public.profiles set points = 0 where points is null;
alter table public.profiles alter column points type numeric(14, 2) using coalesce(points, 0)::numeric(14, 2);
alter table public.profiles alter column points set default 0;
alter table public.profiles alter column points set not null;

alter table public.profiles drop constraint if exists profiles_points_range;
alter table public.profiles
  add constraint profiles_points_range check (points >= 0 and points <= 1000000000);

comment on column public.profiles.points is
  'BFM points balance (1 point = 1 THB). Only changeable via public.admin_adjust_points().';

-- Referenced by the guard trigger below; created by the Smart Search migration.
alter table public.profiles
  add column if not exists smart_search_enabled boolean not null default false;

-- ── Audit ledger ─────────────────────────────────────────────
create table if not exists public.point_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  admin_id        uuid references auth.users (id) on delete set null,
  admin_email     text,
  kind            text not null check (kind in ('add', 'deduct', 'set')),
  amount          numeric(14, 2) not null check (amount >= 0),
  delta           numeric(14, 2) not null,
  balance_before  numeric(14, 2) not null check (balance_before >= 0),
  balance_after   numeric(14, 2) not null check (balance_after >= 0),
  reason          text not null check (char_length(btrim(reason)) between 3 and 500),
  created_at      timestamptz not null default now(),
  constraint point_transactions_balance_math check (balance_after = balance_before + delta)
);

create index if not exists idx_point_transactions_user_created
  on public.point_transactions (user_id, created_at desc);
create index if not exists idx_point_transactions_admin_created
  on public.point_transactions (admin_id, created_at desc);

alter table public.point_transactions enable row level security;

revoke all on public.point_transactions from public, anon, authenticated;
grant select on public.point_transactions to authenticated;

drop policy if exists "Users can view their own point transactions" on public.point_transactions;
create policy "Users can view their own point transactions"
  on public.point_transactions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Admins can view all point transactions" on public.point_transactions;
create policy "Admins can view all point transactions"
  on public.point_transactions for select to authenticated
  using ((select public.is_admin()));

-- Ledger rows are immutable. Deletes are only possible via account deletion cascade
-- (runs as table owner); browser roles have no delete grant and are blocked here too.
create or replace function public.point_transactions_immutable()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Point transactions are immutable.' using errcode = '42501';
  end if;
  if current_user in ('anon', 'authenticated') then
    raise exception 'Point transactions cannot be deleted.' using errcode = '42501';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_point_transactions_immutable on public.point_transactions;
create trigger trg_point_transactions_immutable
  before update or delete on public.point_transactions
  for each row execute function public.point_transactions_immutable();

-- ── Guard privileged profile columns ─────────────────────────
-- SECURITY INVOKER on purpose: current_user is the real caller role. Inside SECURITY
-- DEFINER functions (admin_adjust_points, handle_new_user) and for the service role,
-- current_user is not anon/authenticated, so those trusted paths pass through.
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.points := 0;
    if not public.is_admin() then
      new.role := 'user';
      new.smart_search_enabled := false;
    end if;
    return new;
  end if;

  if new.points is distinct from old.points then
    raise exception 'Points can only be changed by an admin using the points tool.'
      using errcode = '42501';
  end if;

  if (new.role is distinct from old.role
      or new.smart_search_enabled is distinct from old.smart_search_enabled)
     and not public.is_admin() then
    raise exception 'Only admins can change role or Smart Search access.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileged_columns on public.profiles;
create trigger trg_guard_profile_privileged_columns
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- ── The only write path ──────────────────────────────────────
create or replace function public.admin_adjust_points(
  p_user_id uuid,
  p_kind text,
  p_amount numeric,
  p_reason text,
  p_expected_balance numeric default null
)
returns table (balance numeric, transaction_id uuid)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_admin   uuid := auth.uid();
  v_reason  text := btrim(coalesce(p_reason, ''));
  v_amount  numeric(14, 2);
  v_before  numeric(14, 2);
  v_after   numeric(14, 2);
  v_tx      uuid;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'A user is required.' using errcode = '22023';
  end if;

  if p_user_id = v_admin then
    raise exception 'Admins cannot change their own points.' using errcode = '42501';
  end if;

  if p_kind is null or p_kind not in ('add', 'deduct', 'set') then
    raise exception 'Invalid adjustment type.' using errcode = '22023';
  end if;

  if p_amount is null or p_amount < 0 or p_amount <> round(p_amount, 2) then
    raise exception 'Amount must be a positive number with at most 2 decimals.' using errcode = '22023';
  end if;

  if p_kind in ('add', 'deduct') and (p_amount = 0 or p_amount > 1000000) then
    raise exception 'Add/deduct amount must be between 0.01 and 1,000,000.' using errcode = '22023';
  end if;

  if p_kind = 'set' and p_amount > 1000000000 then
    raise exception 'Balance cannot exceed 1,000,000,000.' using errcode = '22023';
  end if;

  if char_length(v_reason) < 3 or char_length(v_reason) > 500 then
    raise exception 'A reason of 3–500 characters is required.' using errcode = '22023';
  end if;

  -- Basic abuse brake: a compromised admin session cannot mass-edit balances.
  if (
    select count(*) from public.point_transactions
    where admin_id = v_admin and created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'Too many point changes. Please wait a minute.' using errcode = '53400';
  end if;

  v_amount := p_amount;

  select p.points into v_before
  from public.profiles p
  where p.id = p_user_id
  for update;

  if not found then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;

  -- Optimistic concurrency: reject stale forms and accidental double submits.
  if p_expected_balance is not null and v_before <> round(p_expected_balance, 2) then
    raise exception 'Balance changed since you loaded it. Refresh and try again.' using errcode = '40001';
  end if;

  v_after := case p_kind
    when 'add'    then v_before + v_amount
    when 'deduct' then v_before - v_amount
    else v_amount
  end;

  if v_after < 0 then
    raise exception 'Cannot deduct more than the current balance.' using errcode = '22023';
  end if;
  if v_after > 1000000000 then
    raise exception 'Balance cannot exceed 1,000,000,000.' using errcode = '22023';
  end if;
  if v_after = v_before then
    raise exception 'The balance would not change.' using errcode = '22023';
  end if;

  update public.profiles set points = v_after where id = p_user_id;

  insert into public.point_transactions (
    user_id, admin_id, admin_email, kind, amount, delta,
    balance_before, balance_after, reason
  ) values (
    p_user_id, v_admin, lower(auth.jwt() ->> 'email'), p_kind, v_amount, v_after - v_before,
    v_before, v_after, v_reason
  )
  returning id into v_tx;

  return query select v_after::numeric, v_tx;
end;
$$;

revoke all on function public.admin_adjust_points(uuid, text, numeric, text, numeric) from public, anon;
grant execute on function public.admin_adjust_points(uuid, text, numeric, text, numeric) to authenticated;

revoke all on function public.guard_profile_privileged_columns() from public, anon, authenticated;
revoke all on function public.point_transactions_immutable() from public, anon, authenticated;

