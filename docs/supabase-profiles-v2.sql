-- CardFlow profiles v2 — customer/account fields (run in Supabase SQL editor)
-- Keeps scanned contacts on-device. This table is account holders only.
-- Run after docs/supabase-schema.sql

alter table public.profiles
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz,
  add column if not exists pro_since timestamptz,
  add column if not exists pro_source text check (pro_source is null or pro_source in ('play', 'promo', 'admin')),
  add column if not exists scan_total integer not null default 0,
  add column if not exists app_version text,
  add column if not exists status text not null default 'active' check (status in ('active', 'banned')),
  add column if not exists is_admin boolean not null default false;

-- View / edit all users in Supabase → Table Editor → profiles
-- (project owners bypass RLS; no separate admin web app)
