-- =============================================================
-- 005: gear catalog for the bottleneck checker
-- Gain figures are STARTER VALUES to verify against each maker's spec sheet.
--  - mic gain_needed_db: rule of thumb for spoken word 2–4 in. from the mic
--  - interface max_gain_db: the maker's published maximum preamp gain
-- Prices stay hidden on the site until price_checked_at is set.
-- =============================================================

create table if not exists public.gear_items (
  slug              text primary key,
  name              text not null,
  kind              text not null check (kind in ('mic','interface','booster')),
  mic_type          mic_type,                       -- mics only
  needs_phantom     boolean not null default false, -- mics, and boosters (they run on 48V)
  gain_needed_db    int,                            -- mics only
  max_gain_db       int,                            -- interfaces only
  has_phantom       boolean,                        -- interfaces only
  mic_inputs        int,                            -- interfaces only
  boost_db          int,                            -- boosters only
  is_generic        boolean not null default false, -- "my mic isn't listed" stand-ins
  sold_new          boolean not null default true,  -- false = can be selected, never recommended
  price_usd         numeric(10,2),
  price_checked_at  timestamptz,
  affiliate_url     text,
  spec_checked_at   timestamptz,
  sort_order        int not null default 100,
  is_active         boolean not null default true,
  constraint mic_fields check (kind <> 'mic' or (mic_type is not null and (mic_type = 'usb' or gain_needed_db is not null))),
  constraint iface_fields check (kind <> 'interface' or (max_gain_db is not null and has_phantom is not null and mic_inputs >= 1)),
  constraint booster_fields check (kind <> 'booster' or boost_db is not null)
);

alter table public.gear_items enable row level security;
create policy "public read active gear" on public.gear_items for select using (is_active);

insert into public.gear_items
  (slug, name, kind, mic_type, needs_phantom, gain_needed_db, is_generic, price_usd, affiliate_url, sort_order) values
('shure-sm7b',       'Shure SM7B',                    'mic', 'dynamic',   false, 60, false, 399, 'https://example.com/aff/sm7b', 10),
('ev-re20',          'Electro-Voice RE20',            'mic', 'dynamic',   false, 58, false, 449, 'https://example.com/aff/re20', 20),
('rode-podmic',      'Rode PodMic (XLR)',             'mic', 'dynamic',   false, 58, false,  99, 'https://example.com/aff/podmic', 30),
('shure-sm58',       'Shure SM58',                    'mic', 'dynamic',   false, 52, false,  99, 'https://example.com/aff/sm58', 40),
('at2020-xlr',       'Audio-Technica AT2020 (XLR)',   'mic', 'condenser', true,  40, false,  99, 'https://example.com/aff/at2020', 50),
('any-usb-mic',      'A USB mic (Yeti, NT-USB, etc.)','mic', 'usb',       false, null, true, null, null, 60),
('generic-quiet-dynamic', 'Not listed: broadcast-style dynamic', 'mic', 'dynamic', false, 60, true, null, null, 90),
('generic-dynamic',  'Not listed: stage-style dynamic','mic', 'dynamic',  false, 52, true, null, null, 91),
('generic-condenser','Not listed: condenser',         'mic', 'condenser', true,  40, true, null, null, 92);

insert into public.gear_items
  (slug, name, kind, max_gain_db, has_phantom, mic_inputs, sold_new, price_usd, affiliate_url, sort_order) values
('scarlett-solo-4',  'Focusrite Scarlett Solo (4th gen)', 'interface', 69, true,  1, true,  139, 'https://example.com/aff/solo4', 10),
('scarlett-2i2-4',   'Focusrite Scarlett 2i2 (4th gen)',  'interface', 69, true,  2, true,  199, 'https://example.com/aff/2i24', 20),
('scarlett-solo-3',  'Focusrite Scarlett Solo (3rd gen)', 'interface', 56, true,  1, false, null, null, 30),
('scarlett-2i2-3',   'Focusrite Scarlett 2i2 (3rd gen)',  'interface', 56, true,  2, false, null, null, 40),
('elgato-wave-xlr',  'Elgato Wave XLR',                   'interface', 75, true,  1, true,  159, 'https://example.com/aff/wavexlr', 50),
('zoom-podtrak-p4',  'Zoom PodTrak P4',                   'interface', 70, false, 4, true,  149, 'https://example.com/aff/p4', 60),
('rodecaster-duo',   'Rodecaster Duo',                    'interface', 76, true,  2, true,  499, 'https://example.com/aff/duo', 70),
('rodecaster-pro-2', 'Rodecaster Pro II',                 'interface', 76, true,  4, true,  699, 'https://example.com/aff/rcp2', 80);

insert into public.gear_items
  (slug, name, kind, needs_phantom, boost_db, price_usd, affiliate_url, sort_order) values
('cloudlifter-cl1',  'Cloudlifter CL-1 inline booster', 'booster', true, 25, 149, 'https://example.com/aff/cl1', 10);

-- Rebuild the installments view: the original `select *` froze its column list
-- before 002 added category and friends, and security_invoker makes the view
-- respect RLS so inactive bundles stay hidden from the public key.
drop view if exists public.hardware_bundles_with_installments;
create view public.hardware_bundles_with_installments
with (security_invoker = true) as
select *,
  case when installment_months is not null
       then round(cash_price_usd / installment_months, 2) end as installment_monthly_usd
from public.hardware_bundles;
