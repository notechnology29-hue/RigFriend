-- =============================================================
-- 002: widen the schema for bundles 6–10
-- Hardware bundles are no longer all "mic -> interface" chains
-- (wireless lav kits, PAs, MIDI rigs), and SaaS bundles carry
-- quiz-match fields. Commission data moves to a private table.
-- Run after schema.sql.
-- =============================================================

-- ---------- SaaS: new use cases + quiz fields ----------
alter type saas_use_case add value if not exists 'live_stream';
alter type saas_use_case add value if not exists 'courses';
alter type saas_use_case add value if not exists 'lead_gen';
alter type saas_use_case add value if not exists 'localization';

alter table public.saas_bundles
  add column if not exists bottleneck         text,
  add column if not exists budget_tier        text check (budget_tier in ('under_75','under_100','100_plus','pro')),
  add column if not exists compatibility_tags jsonb not null default '{}';

-- ---------- Hardware: category + optional signal chain ----------
create type hardware_category as enum ('mic_chain', 'wireless_lav', 'field_recorder', 'live_pa', 'stream_desk', 'production');

alter table public.hardware_bundles
  add column if not exists category           hardware_category not null default 'mic_chain',
  add column if not exists environment        text,
  add column if not exists budget_min_usd     numeric(10,2),
  add column if not exists budget_max_usd     numeric(10,2),
  add column if not exists signal_chain_rules jsonb not null default '{}',
  add column if not exists review_note        text;   -- why a bundle is inactive

-- Bundles without a mic->preamp chain (MIDI rigs, some PAs) have no gain figures.
alter table public.hardware_bundles
  alter column mic_type drop not null,
  alter column min_preamp_gain_db drop not null,
  alter column interface_max_gain_db drop not null;

-- Gain/phantom checks now apply only to ACTIVE bundles that have a mic chain,
-- so a broken bundle can be stored as a draft but never published.
alter table public.hardware_bundles drop constraint if exists gain_ok;
alter table public.hardware_bundles drop constraint if exists phantom_ok;
alter table public.hardware_bundles add constraint gain_ok check (
  not is_active or min_preamp_gain_db is null
  or coalesce(interface_max_gain_db, 0) + inline_preamp_gain_db >= min_preamp_gain_db
);
alter table public.hardware_bundles add constraint phantom_ok check (
  not is_active or not requires_phantom_power or interface_has_phantom
);

-- Installment amounts: allow 8-pay terms (zZounds offers them on some items).
alter table public.hardware_bundles drop constraint if exists hardware_bundles_installment_months_check;
alter table public.hardware_bundles add constraint hardware_bundles_installment_months_check
  check (installment_months in (3,4,6,8,12,18,24));

-- ---------- Private economics (never exposed to the browser) ----------
create table if not exists public.bundle_economics (
  bundle_slug        text primary key,
  niche              text not null check (niche in ('saas','hardware')),
  upfront_cpa_usd    numeric(10,2) not null default 0,
  recurring_usd_mo   numeric(10,2) not null default 0,
  recurring_months   int,                     -- null = lifetime
  notes              text,
  terms_checked_at   timestamptz,
  updated_at         timestamptz not null default now()
);
alter table public.bundle_economics enable row level security;
-- No policies on purpose: only the service role can read or write it.
