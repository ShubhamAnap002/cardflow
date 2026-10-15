-- CardFlow profiles (run in Supabase SQL editor)
-- Auth providers to enable:
--   1) Email / Password
--   2) Google (see docs/GOOGLE_AUTH.md)
-- After this file, also run:
--   docs/supabase-profiles-v2.sql
--   docs/supabase-delete-account.sql
--   docs/supabase-profiles-rls-harden.sql  (blocks self-grant Pro / quota reset)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  ocr_month text,
  ocr_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  pro_since timestamptz,
  pro_source text check (pro_source is null or pro_source in ('play', 'promo', 'admin')),
  scan_total integer not null default 0,
  app_version text,
  status text not null default 'active' check (status in ('active', 'banned')),
  is_admin boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on email or Google signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, plan, ocr_month, ocr_count, created_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'display_name'
    ),
    'free',
    to_char(now(), 'YYYY-MM'),
    0,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Account self-deletion (Play Console requirement when accounts exist)
create or replace function public.delete_own_account()
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
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
