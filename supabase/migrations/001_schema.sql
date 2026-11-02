-- =============================================================
-- Affiliate engine schema (Supabase / Postgres)
-- Run in the Supabase SQL editor, or as a migration.
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type mic_type as enum ('dynamic', 'condenser', 'usb', 'ribbon');
-- Every use case is declared here, including those 002 and 008 add. Postgres can't use an enum
-- value in the same transaction that adds it, and 002/008 insert rows right after adding theirs.
create type saas_use_case as enum ('podcast', 'youtube', 'short_form', 'voiceover', 'music',
  'live_stream', 'courses', 'lead_gen', 'localization', 'faceless', 'agency', 'network');

-- ---------- SaaS bundles ----------
create table public.saas_bundles (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  name                text not null,
  use_case            saas_use_case not null,
  description         text,
  monthly_price_usd   numeric(10,2) not null check (monthly_price_usd >= 0),
  -- Conservative, sourced estimate of editing time removed (0.00–0.90).
  -- Keep a note of where each number came from; the calculator shows it as an estimate.
  est_time_saved_pct  numeric(4,2) not null check (est_time_saved_pct between 0 and 0.90),
  export_resolution   text check (export_resolution in ('720p','1080p','4k')),
  tools               jsonb not null default '[]',   -- [{name, role, affiliate_url, monthly_price_usd}]
  is_active           boolean not null default true,
  price_checked_at    timestamptz,                    -- set when you last verified pricing
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------- Hardware bundles ----------
create table public.hardware_bundles (
  id                       uuid primary key default gen_random_uuid(),
  slug                     text unique not null,
  name                     text not null,
  people_count             int not null default 1 check (people_count between 1 and 8),
  description              text,
  cash_price_usd           numeric(10,2) not null check (cash_price_usd >= 0),
  installment_months       int check (installment_months in (3,4,6,12,18,24)),
  installment_retailer     text,                       -- e.g. 'zZounds', 'B&H'
  -- Compatibility flags used by the bottleneck checker
  mic_type                 mic_type not null,
  requires_phantom_power   boolean not null default false,
  min_preamp_gain_db       int not null,               -- clean gain the mic needs for speech
  interface_max_gain_db    int not null,               -- what the bundled interface provides
  inline_preamp_gain_db    int not null default 0,     -- e.g. Cloudlifter-style booster, 0 if none
  interface_has_phantom    boolean not null default true,
  components               jsonb not null default '[]', -- [{name, role, affiliate_url, price_usd}]
  is_active                boolean not null default true,
  price_checked_at         timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  -- A bundle can never ship with a gain or phantom-power bottleneck.
  constraint gain_ok    check (interface_max_gain_db + inline_preamp_gain_db >= min_preamp_gain_db),
  constraint phantom_ok check (not requires_phantom_power or interface_has_phantom)
);

-- Monthly installment shown in the UI (no interest assumed; display retailer terms verbatim).
create view public.hardware_bundles_with_installments as
select *,
  case when installment_months is not null
       then round(cash_price_usd / installment_months, 2) end as installment_monthly_usd
from public.hardware_bundles;

-- ---------- Leads (email capture) ----------
create table public.leads (
  id               uuid primary key default gen_random_uuid(),
  email            text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source_tool      text not null check (source_tool in ('roi_calculator','bottleneck_checker')),
  build            jsonb not null,          -- snapshot of inputs + recommended bundle
  marketing_consent boolean not null default false,
  sequence_step    int not null default 0,  -- 0 = not started, 1..5 = last email sent
  next_send_at     timestamptz,
  unsubscribed_at  timestamptz,
  created_at       timestamptz not null default now()
);
create index leads_next_send_idx on public.leads (next_send_at)
  where unsubscribed_at is null and marketing_consent;

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger saas_touch before update on public.saas_bundles
  for each row execute function public.touch_updated_at();
create trigger hw_touch before update on public.hardware_bundles
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.saas_bundles     enable row level security;
alter table public.hardware_bundles enable row level security;
alter table public.leads            enable row level security;

create policy "public read active saas"     on public.saas_bundles     for select using (is_active);
create policy "public read active hardware" on public.hardware_bundles for select using (is_active);
-- Leads: anonymous users may insert only; reads/updates happen server-side with the service role.
create policy "anon insert leads" on public.leads for insert to anon with check (true);

-- =============================================================
-- SEED DATA — representative examples only.
-- Replace with your 20 bundles. Prices, specs and affiliate URLs
-- below are placeholders: verify each, then set price_checked_at.
-- =============================================================

insert into public.saas_bundles
  (slug, name, use_case, description, monthly_price_usd, est_time_saved_pct, export_resolution, tools)
values
('solo-podcast-starter', 'Solo podcast starter stack', 'podcast',
 'Transcript-based editing, filler-word removal and auto clips.', 46.00, 0.35, '1080p',
 '[{"name":"Text-based editor","role":"edit","affiliate_url":"https://example.com/aff/editor","monthly_price_usd":24},
   {"name":"Clip generator","role":"repurpose","affiliate_url":"https://example.com/aff/clips","monthly_price_usd":15},
   {"name":"Audio cleanup","role":"polish","affiliate_url":"https://example.com/aff/cleanup","monthly_price_usd":7}]'),
('youtube-pro-stack', 'YouTube pro stack', 'youtube',
 'Remote recording, AI rough cut and thumbnail tooling.', 89.00, 0.40, '4k',
 '[{"name":"Remote recorder","role":"record","affiliate_url":"https://example.com/aff/recorder","monthly_price_usd":29},
   {"name":"AI rough-cut editor","role":"edit","affiliate_url":"https://example.com/aff/roughcut","monthly_price_usd":40},
   {"name":"Thumbnail designer","role":"design","affiliate_url":"https://example.com/aff/thumbs","monthly_price_usd":20}]'),
('shortform-machine', 'Short-form clip machine', 'short_form',
 'Long video in, captioned vertical clips out.', 58.00, 0.50, '1080p',
 '[{"name":"Clip generator","role":"repurpose","affiliate_url":"https://example.com/aff/clips","monthly_price_usd":29},
   {"name":"Caption styler","role":"captions","affiliate_url":"https://example.com/aff/captions","monthly_price_usd":19},
   {"name":"Scheduler","role":"publish","affiliate_url":"https://example.com/aff/sched","monthly_price_usd":10}]');

insert into public.hardware_bundles
  (slug, name, people_count, description, cash_price_usd, installment_months, installment_retailer,
   mic_type, requires_phantom_power, min_preamp_gain_db, interface_max_gain_db, inline_preamp_gain_db,
   interface_has_phantom, components)
values
('solo-dynamic-boosted', 'Solo dynamic broadcast rig', 1,
 'Low-output broadcast dynamic plus an inline booster so a budget interface has headroom.',
 649.00, 4, 'zZounds', 'dynamic', false, 60, 56, 25, true,
 '[{"name":"Broadcast dynamic mic","role":"mic","affiliate_url":"https://example.com/aff/mic1","price_usd":399},
   {"name":"Inline mic booster","role":"preamp","affiliate_url":"https://example.com/aff/boost","price_usd":149},
   {"name":"1-in USB interface","role":"interface","affiliate_url":"https://example.com/aff/if1","price_usd":101}]'),
('solo-condenser-home', 'Home studio condenser rig', 1,
 'Large-diaphragm condenser for treated rooms and voiceover.',
 389.00, 4, 'zZounds', 'condenser', true, 40, 56, 0, true,
 '[{"name":"Large-diaphragm condenser","role":"mic","affiliate_url":"https://example.com/aff/ldc","price_usd":249},
   {"name":"2-in USB interface","role":"interface","affiliate_url":"https://example.com/aff/if2","price_usd":140}]'),
('two-person-studio', '2-person podcast studio', 2,
 'Two dynamics, a podcast mixer with high-gain preamps, arms and headphones.',
 1089.00, 6, 'zZounds', 'dynamic', false, 55, 70, 0, true,
 '[{"name":"Dynamic mic x2","role":"mic","affiliate_url":"https://example.com/aff/mic2","price_usd":398},
   {"name":"Podcast mixer","role":"interface","affiliate_url":"https://example.com/aff/mixer","price_usd":499},
   {"name":"Boom arm x2","role":"mount","affiliate_url":"https://example.com/aff/arm","price_usd":98},
   {"name":"Closed-back headphones x2","role":"monitor","affiliate_url":"https://example.com/aff/hp","price_usd":94}]');
