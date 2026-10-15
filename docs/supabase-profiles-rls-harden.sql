-- CardFlow: harden profiles so clients cannot self-grant Pro or reset quotas.
-- Run in Supabase SQL editor AFTER supabase-schema.sql / supabase-profiles-v2.sql
--
-- What this does:
-- 1) Trigger blocks direct UPDATE of plan / OCR / status / admin fields
--    (unless service_role, or an RPC that sets cardflow.allow_privileged=1).
-- 2) RPCs for Play plan sync + OCR bump (app uses these instead of raw updates).
-- 3) Promo/admin Pro: set only in Table Editor (service role) or future admin tooling.

-- ---------------------------------------------------------------------------
-- Privileged-column guard
-- ---------------------------------------------------------------------------
create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  -- Dashboard / service role may change anything.
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  -- RPCs below set this for a single transaction.
  if coalesce(current_setting('cardflow.allow_privileged', true), '') = '1' then
    return new;
  end if;

  -- Force privileged fields back to previous values for normal client updates.
  new.plan := old.plan;
  new.pro_since := old.pro_since;
  new.pro_source := old.pro_source;
  new.ocr_month := old.ocr_month;
  new.ocr_count := old.ocr_count;
  new.scan_total := old.scan_total;
  new.status := old.status;
  new.is_admin := old.is_admin;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
  before update on public.profiles
  for each row
  execute procedure public.profiles_guard_privileged_columns();

-- Inserts from clients must start as free / active (trigger handle_new_user also sets free).
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and plan = 'free'
    and status = 'active'
    and coalesce(is_admin, false) = false
  );

-- ---------------------------------------------------------------------------
-- RPC: mark Play plan (called after IAP grant/revoke). Still authenticated-only;
-- app treats Play Billing as source of truth for unlock, not this row alone.
-- ---------------------------------------------------------------------------
create or replace function public.set_own_play_plan(p_plan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_plan not in ('free', 'pro') then
    raise exception 'Invalid plan';
  end if;

  perform set_config('cardflow.allow_privileged', '1', true);

  if p_plan = 'pro' then
    update public.profiles
    set
      plan = 'pro',
      pro_source = 'play',
      pro_since = coalesce(pro_since, now()),
      updated_at = now()
    where id = uid;
  else
    update public.profiles
    set
      plan = 'free',
      pro_source = null,
      updated_at = now()
    where id = uid
      and coalesce(pro_source, 'play') = 'play';
    -- Do not clear promo/admin Pro via this RPC.
  end if;
end;
$$;

revoke all on function public.set_own_play_plan(text) from public;
grant execute on function public.set_own_play_plan(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: bump OCR usage (count can only stay or increase within a month)
-- ---------------------------------------------------------------------------
create or replace function public.bump_own_ocr_usage(p_month text, p_count integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur_month text;
  cur_count integer;
  cur_total integer;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_month is null or length(p_month) < 7 then
    raise exception 'Invalid month';
  end if;
  if p_count is null or p_count < 0 then
    raise exception 'Invalid count';
  end if;

  select ocr_month, ocr_count, scan_total
    into cur_month, cur_count, cur_total
  from public.profiles
  where id = uid
  for update;

  if not found then
    return;
  end if;

  perform set_config('cardflow.allow_privileged', '1', true);

  if cur_month is distinct from p_month then
    update public.profiles
    set
      ocr_month = p_month,
      ocr_count = least(p_count, 300),
      scan_total = coalesce(cur_total, 0) + 1,
      last_seen_at = now(),
      updated_at = now()
    where id = uid;
  else
    update public.profiles
    set
      ocr_count = least(greatest(coalesce(cur_count, 0), p_count), 300),
      scan_total = coalesce(cur_total, 0) + 1,
      last_seen_at = now(),
      updated_at = now()
    where id = uid;
  end if;
end;
$$;

revoke all on function public.bump_own_ocr_usage(text, integer) from public;
grant execute on function public.bump_own_ocr_usage(text, integer) to authenticated;
