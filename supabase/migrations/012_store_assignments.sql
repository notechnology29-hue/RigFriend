-- =============================================================
-- 012: which store each product goes to.
-- Rule: zZounds (6%, prices hidden) for high-ticket builds where the payout wins;
-- B&H (2%, prices shown) where the price is the selling point: the gear checker's
-- cheapest fixes, budget builds and impulse buys. Each build stays on one store,
-- so visitors check out in a single cart and bundle totals can show where allowed.
-- Change any product later from the admin Links tab.
-- Run after 011.
-- =============================================================

-- One RE20 entry instead of two: point the talk-radio desk at the catalog product.
update public.hardware_bundles hb set components = (
  select jsonb_agg(case when e.elem->>'name' = 'Electro-Voice RE20'
                        then e.elem || '{"product_slug":"ev-re20"}'::jsonb else e.elem end order by e.ord)
  from jsonb_array_elements(hb.components) with ordinality e(elem, ord))
where slug = 'talk-radio-stream-desk';
delete from public.tracked_products
 where slug = 'electro-voice-re20'
   and not exists (select 1 from public.hardware_bundles
                   where components @> '[{"product_slug":"electro-voice-re20"}]'::jsonb);

-- zZounds: payout wins (vocal rig, two-host desk, PA rig, guitar rig, beatmaker)
select public.set_product_links(slug, null, null, 'zzounds')
from public.tracked_products
where name in (
  'Shure SM7B', 'Shure SM7dB (preamp on)', 'Shure SM7dB', 'Electro-Voice RE20',
  'Focusrite Scarlett 2i2 (4th gen)', 'Sennheiser HD 200 PRO',
  'RØDECaster Duo 2-person kit', 'Rodecaster Duo', 'Rodecaster Pro II',
  'Bose S1 Pro+', 'Shure BLX24/SM58',
  'HeadRush Prime', 'Universal Audio Volt 276', 'Akai MPK Mini Plus'
);

-- B&H: price sells it (checker fixes, budget and impulse builds)
select public.set_product_links(slug, null, null, 'bh')
from public.tracked_products
where name in (
  'Cloudlifter CL-1 inline booster', 'Focusrite Scarlett Solo (4th gen)', 'Elgato Wave XLR',
  'Zoom PodTrak P4', 'Dynamic XLR mic',
  'Rode PodMic (XLR)', 'Shure SM58', 'Audio-Technica AT2020 (XLR)',
  'DJI Mic 2 (2-person)', 'Shure MV7+', 'Focusrite Scarlett 2i2 Studio (4th gen)',
  'Elgato Stream Deck +'
);

-- Anything still without a store shows up first in the admin Links tab.
select slug, name from public.tracked_products where retailer is null order by name;
