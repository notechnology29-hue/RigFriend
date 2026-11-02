-- =============================================================
-- 013: fix the talk-radio & live stream desk (hardware bundle 9).
-- It had no audio interface, so the RE20 couldn't reach the computer.
-- Adds the Elgato Wave XLR: 75 dB of gain (17 dB of headroom over the RE20's ~58),
-- phantom power, and Elgato's Wave Link mixer, which the Stream Deck +'s dials control.
-- The whole build moves to B&H so it's one cart and its price can show.
-- Stays OFF until you verify prices and switch it on in the admin Bundles tab.
-- Run after 012.
-- =============================================================

update public.hardware_bundles set
  name = 'Live stream & talk show desk',
  description = 'A broadcast mic that sounds even when you turn your head, a high-gain interface, and hands-on dials and buttons for running a live show.',
  category = 'stream_desk',
  cash_price_usd = 787.99,
  budget_min_usd = 750, budget_max_usd = 800,
  installment_months = null, installment_retailer = null,
  mic_type = 'dynamic', requires_phantom_power = false,
  min_preamp_gain_db = 58, interface_max_gain_db = 75, inline_preamp_gain_db = 0, interface_has_phantom = true,
  signal_chain_rules = '{"proximity_effect_free": true, "hardware_mixer_dials": true, "wave_link_mixing": true}',
  components = '[
    {"name":"Electro-Voice RE20","role":"mic","affiliate_url":"https://example.com/aff/re20","price_usd":449,"product_slug":"ev-re20","qty":1,"retailer":"bh"},
    {"name":"Elgato Wave XLR","role":"interface","affiliate_url":"https://example.com/aff/wavexlr","price_usd":159,"product_slug":"elgato-wave-xlr","qty":1,"retailer":"bh"},
    {"name":"Elgato Stream Deck +","role":"control surface","affiliate_url":"https://example.com/aff/sdplus","price_usd":179.99,"product_slug":"elgato-stream-deck","qty":1,"retailer":"bh"}
  ]',
  is_active = false,
  review_note = 'Fixed: interface added. Verify prices, that the Stream Deck + dials control Wave Link with the Wave XLR, and a boom arm that holds the heavy RE20, then go live'
where slug = 'talk-radio-stream-desk';

-- The RE20 follows its build to B&H (also updates the gear catalog).
select public.set_product_links('ev-re20', null, null, 'bh');

-- Make sure every part is tracked by the weekly checker.
select public.sync_gear_products();
select public.sync_tracked_products();

update public.bundle_economics
   set upfront_cpa_usd = 15.76, notes = 'B&H 2% of $787.99', terms_checked_at = null, updated_at = now()
 where bundle_slug = 'talk-radio-stream-desk';
