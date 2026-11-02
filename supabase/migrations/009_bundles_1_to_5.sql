-- =============================================================
-- 009: bundles 1–5 for both niches, loaded as INACTIVE drafts.
-- Prices, plans, specs and claims come from planning notes and are unverified.
-- The weekly checker starts tracking their products right away; activate each
-- bundle once its prices and claims check out:
--   update saas_bundles     set is_active = true, review_note = null where slug = '...';
--   update hardware_bundles set is_active = true, review_note = null where slug = '...';
-- Also retires the six placeholder bundles from schema.sql (generic tool names
-- like "Text-based editor" can't carry real affiliate links).
-- Run after 008.
-- =============================================================

alter table public.saas_bundles add column if not exists review_note text;

-- Use an explicit product_slug from a component when present, so a bundle can point
-- at a product already in the catalog instead of creating a duplicate.
create or replace function public.sync_tracked_products() returns int
language plpgsql as $$
declare added int;
begin
  drop table if exists _items;
  create temp table _items on commit drop as
  select x.*, x.line_price / x.qty as unit_price, public.slugify(x.clean_name) as base
  from (
    select 'hardware'::text as niche, hb.id as bundle_id, e.ord,
           regexp_replace(e.elem->>'name', '\s+x(\d+)$', '') as clean_name,
           coalesce(substring(e.elem->>'name' from '\s+x(\d+)$')::int, 1) as qty,
           (e.elem->>'price_usd')::numeric as line_price,
           e.elem->>'affiliate_url' as aff,
           e.elem->>'product_slug' as preset
    from public.hardware_bundles hb,
         jsonb_array_elements(hb.components) with ordinality e(elem, ord)
    union all
    select 'saas', sb.id, e.ord, e.elem->>'name', 1,
           (e.elem->>'monthly_price_usd')::numeric, e.elem->>'affiliate_url',
           e.elem->>'product_slug'
    from public.saas_bundles sb,
         jsonb_array_elements(sb.tools) with ordinality e(elem, ord)
  ) x;

  alter table _items add column slug text;
  update _items i set slug = i.base || case when m.multi then '-' || round(i.unit_price)::text else '' end
  from (select niche, base, count(distinct unit_price) > 1 as multi
        from _items where preset is null group by niche, base) m
  where i.preset is null and m.niche = i.niche and m.base = i.base;
  update _items set slug = preset where preset is not null;

  insert into public.tracked_products (slug, name, niche, affiliate_url, approved_price_usd, price_source)
  select distinct on (slug) slug, clean_name, niche, aff, unit_price,
         case when niche = 'saas' then 'manual' else 'jsonld' end
  from _items order by slug
  on conflict (slug) do nothing;
  get diagnostics added = row_count;

  update public.hardware_bundles hb set components = (
    select jsonb_agg(case when e.elem ? 'product_slug' then e.elem
                          else e.elem || jsonb_build_object('product_slug', i.slug, 'qty', i.qty) end
                     order by e.ord)
    from jsonb_array_elements(hb.components) with ordinality e(elem, ord)
    join _items i on i.niche = 'hardware' and i.bundle_id = hb.id and i.ord = e.ord)
  where exists (select 1 from jsonb_array_elements(hb.components) c where not c ? 'product_slug');

  update public.saas_bundles sb set tools = (
    select jsonb_agg(case when e.elem ? 'product_slug' then e.elem
                          else e.elem || jsonb_build_object('product_slug', i.slug) end
                     order by e.ord)
    from jsonb_array_elements(sb.tools) with ordinality e(elem, ord)
    join _items i on i.niche = 'saas' and i.bundle_id = sb.id and i.ord = e.ord)
  where exists (select 1 from jsonb_array_elements(sb.tools) c where not c ? 'product_slug');

  return added;
end $$;
revoke execute on function public.sync_tracked_products() from public, anon, authenticated;

-- ---------- Retire the placeholders ----------
update public.saas_bundles set is_active = false, review_note = 'Placeholder from schema.sql, replaced by real bundles'
 where slug in ('solo-podcast-starter', 'youtube-pro-stack', 'shortform-machine');
update public.hardware_bundles set is_active = false, review_note = 'Placeholder from schema.sql, replaced by real bundles'
 where slug in ('solo-dynamic-boosted', 'solo-condenser-home', 'two-person-studio');

-- ---------- Gear catalog: the SM7dB (built-in +28 dB preamp, runs on phantom power) ----------
insert into public.gear_items (slug, name, kind, mic_type, needs_phantom, gain_needed_db, price_usd, affiliate_url, sort_order)
values ('shure-sm7db', 'Shure SM7dB (preamp on)', 'mic', 'dynamic', true, 32, 549, 'https://example.com/aff/sm7db', 15)
on conflict (slug) do nothing;

-- ---------- Software bundles 1–5 (drafts) ----------
insert into public.saas_bundles
  (slug, name, use_case, description, monthly_price_usd, est_time_saved_pct, export_resolution,
   bottleneck, budget_tier, compatibility_tags, tools, is_active, review_note)
values
('solo-video-podcast', 'Solo video podcast stack', 'podcast',
 'Record in 4K, edit by editing the transcript, and turn every episode into vertical clips, plus a free newsletter to grow your audience.',
 46.00, 0.40, '4k', 'editing_time', 'under_75',
 '{"direct_descript_sync": true}',
 '[{"name":"Riverside Standard","role":"remote recording","affiliate_url":"https://example.com/aff/riverside","monthly_price_usd":15},
   {"name":"Descript Hobbyist","role":"text-based editing","affiliate_url":"https://example.com/aff/descript","monthly_price_usd":16},
   {"name":"OpusClip Starter","role":"vertical clips","affiliate_url":"https://example.com/aff/opusclip","monthly_price_usd":15,"product_slug":"opusclip"},
   {"name":"Beehiiv Launch","role":"newsletter (free plan)","affiliate_url":"https://example.com/aff/beehiiv","monthly_price_usd":0}]',
 false, 'Draft: verify plan names, prices and the Riverside-to-Descript export'),

('faceless-short-form', 'Faceless short-form stack', 'faceless',
 'AI voiceover, licensed music and footage, and automatic captions for channels that never show a face.',
 67.50, 0.45, '1080p', 'voice_and_visuals', 'under_75',
 '{"monetization_cleared": true}',
 '[{"name":"ElevenLabs Creator","role":"AI voiceover","affiliate_url":"https://example.com/aff/elevenlabs","monthly_price_usd":22},
   {"name":"Artlist Social","role":"music + footage","affiliate_url":"https://example.com/aff/artlist","monthly_price_usd":16.50},
   {"name":"OpusClip Pro","role":"captions + clips","affiliate_url":"https://example.com/aff/opusclip","monthly_price_usd":29}]',
 false, 'Draft: OpusClip clips long videos; confirm it fits faceless workflows or swap in a short-form editor'),

('multi-show-producer', 'Multi-show producer stack', 'agency',
 'Record, edit, clip and host several shows or client podcasts from one set of accounts.',
 96.00, 0.40, '4k', 'clipping_and_distribution', 'under_100',
 '{"multi_show_rss": true}',
 '[{"name":"Riverside Pro","role":"remote recording","affiliate_url":"https://example.com/aff/riverside","monthly_price_usd":24},
   {"name":"Descript Pro","role":"text-based editing","affiliate_url":"https://example.com/aff/descript","monthly_price_usd":24,"product_slug":"descript"},
   {"name":"OpusClip Pro","role":"vertical clips","affiliate_url":"https://example.com/aff/opusclip","monthly_price_usd":29},
   {"name":"Transistor Starter","role":"podcast hosting","affiliate_url":"https://example.com/aff/transistor","monthly_price_usd":19}]',
 false, 'Draft: verify Transistor covers multiple shows on the starter plan'),

('musician-release', 'Musician release stack', 'music',
 'Master your tracks, release them to streaming services, and get licensed footage for promo videos.',
 58.99, 0.20, null, 'release_and_promo', 'under_75',
 '{"wav_24bit_support": true}',
 '[{"name":"LANDR Studio","role":"mastering + distribution","affiliate_url":"https://example.com/aff/landr","monthly_price_usd":19},
   {"name":"Artlist Max","role":"music, footage + LUTs","affiliate_url":"https://example.com/aff/artlistmax","monthly_price_usd":39.99}]',
 false, 'Draft: verify LANDR Studio includes distribution; lalal.ai left out (one-time pack, not monthly)'),

('indie-media-network', 'Indie media network stack', 'network',
 'For shows that earn from sponsors: a newsletter with an ad network, automatic podcast ads, and high-volume clips.',
 215.00, 0.35, '4k', 'monetization', 'pro',
 '{"dynamic_ads": true, "ad_network_access": true}',
 '[{"name":"Beehiiv Scale","role":"newsletter + ad network","affiliate_url":"https://example.com/aff/beehiiv","monthly_price_usd":84},
   {"name":"Riverside Pro","role":"remote recording","affiliate_url":"https://example.com/aff/riverside","monthly_price_usd":24},
   {"name":"OpusClip Pro (2 seats)","role":"vertical clips","affiliate_url":"https://example.com/aff/opusclip","monthly_price_usd":58},
   {"name":"Transistor Professional","role":"hosting + dynamic ads","affiliate_url":"https://example.com/aff/transistor","monthly_price_usd":49}]',
 false, 'Draft: planning notes list Beehiiv Scale at both $42 and $84; confirm the real price');

-- ---------- Hardware bundles 1–5 (drafts) ----------
insert into public.hardware_bundles
  (slug, name, people_count, category, environment, description, cash_price_usd,
   installment_months, installment_retailer, budget_min_usd, budget_max_usd,
   mic_type, requires_phantom_power, min_preamp_gain_db, interface_max_gain_db,
   inline_preamp_gain_db, interface_has_phantom, signal_chain_rules, components, is_active, review_note)
values
('no-booster-broadcast-vocal', 'No-booster broadcast vocal rig', 1, 'mic_chain', 'untreated_room',
 'A broadcast dynamic with its own built-in preamp, so you get SM7B-style sound without buying an inline booster.',
 837.00, 6, 'zZounds', 800, 900,
 'dynamic', true, 32, 69, 0, true,
 '{"built_in_mic_preamp_db": 28, "closed_back_monitoring": true}',
 '[{"name":"Shure SM7dB","role":"mic","affiliate_url":"https://example.com/aff/sm7db","price_usd":549,"product_slug":"shure-sm7db","qty":1},
   {"name":"Focusrite Scarlett 2i2 (4th gen)","role":"interface","affiliate_url":"https://example.com/aff/2i24","price_usd":199,"product_slug":"scarlett-2i2-4","qty":1},
   {"name":"Sennheiser HD 200 PRO","role":"headphones","affiliate_url":"https://example.com/aff/hd200","price_usd":89}]',
 false, 'Draft: planning notes priced the 2i2 at $224.99 here and $199 elsewhere; confirm prices and zZounds payment terms'),

('songwriter-condenser-starter', 'Songwriter starter studio', 1, 'mic_chain', 'quiet_room',
 'Interface, condenser mic and headphones in one box, for vocals and acoustic instruments in a quiet room.',
 339.99, 4, 'zZounds', 300, 350,
 'condenser', true, 40, 69, 0, true,
 '{"quiet_room_only": true, "all_in_one_pack": true}',
 '[{"name":"Focusrite Scarlett 2i2 Studio (4th gen)","role":"interface + condenser mic + headphones","affiliate_url":"https://example.com/aff/2i2studio","price_usd":339.99}]',
 false, 'Draft: confirm what the Studio pack includes, its price and payment terms'),

('usb-xlr-hybrid-creator', 'USB or XLR creator mic', 1, 'mic_chain', 'untreated_room',
 'One mic that plugs straight into your computer over USB, with built-in processing for untreated rooms, and an XLR output for later.',
 299.00, null, null, 280, 320,
 'usb', false, null, null, 0, true,
 '{"onboard_dsp": true, "xlr_upgrade_ready": true}',
 '[{"name":"Shure MV7+","role":"USB + XLR mic","affiliate_url":"https://example.com/aff/mv7plus","price_usd":299}]',
 false, 'Draft: verify price and how much interface gain the XLR output needs'),

('two-host-broadcast-desk', 'Two-host broadcast desk', 2, 'mic_chain', 'living_room',
 'A podcast console with high-gain preamps, two mics and call-in support, for co-hosted and live shows.',
 1089.90, null, null, 1000, 1100,
 'dynamic', false, 58, 76, 0, true,
 '{"mix_minus_calls": true, "dual_usb": true}',
 '[{"name":"RØDECaster Duo 2-person kit","role":"console + 2 mics","affiliate_url":"https://example.com/aff/duokit","price_usd":1089.90}]',
 false, 'Draft: confirm what the 2-person kit includes, its mics and price; add a payment plan only if a retailer offers one'),

('guitar-vocal-modeler', 'Direct-to-DAW guitar and vocal rig', 1, 'production', 'apartment_or_stage',
 'Amp modeling, vocal effects and a USB audio interface in one floorboard, for silent home recording and live gigs. Guitar-only players can save with the smaller Flex Prime.',
 999.00, null, null, 950, 1050,
 null, false, null, null, 0, true,
 '{"built_in_usb_interface": true, "vocal_xlr_input": true, "amp_cloning": true}',
 '[{"name":"HeadRush Prime","role":"modeler + interface","affiliate_url":"https://example.com/aff/headrushprime","price_usd":999}]',
 false, 'Draft: verify price, vocal input and features');

-- Track every new product (gear catalog first, then bundle parts).
select public.sync_gear_products();
select public.sync_tracked_products();
