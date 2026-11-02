-- =============================================================
-- 015: "Fix it after recording" audio cleanup stack (software, draft).
-- Cleanvoice: removes filler words, mouth sounds, stutters, dead air and background noise.
-- Auphonic: evens out levels, sets loudness, reduces noise and hum, removes mic bleed in multitrack.
-- Planning prices: Cleanvoice's 10-hour plan is listed around $11/mo (about €10 + VAT on its
-- own pricing page); Auphonic's entry plan is assumed at a similar $11/mo. CONFIRM both prices,
-- and confirm each one has an affiliate program you're approved for, before going live.
-- Run after 014.
-- =============================================================
insert into public.saas_bundles
  (slug, name, use_case, description, monthly_price_usd, est_time_saved_pct, export_resolution,
   bottleneck, budget_tier, compatibility_tags, tools, is_active, review_note)
values
('audio-rescue-stack', 'Fix-it-after-recording audio stack', 'podcast',
 'Clean up recordings you already have: cut filler words, mouth clicks and dead air, reduce background noise and hiss, and even out the volume.',
 22.00, 0.25, null, 'audio_quality', 'under_75',
 '{"filler_and_noise_cleanup": true, "auto_leveling": true}',
 '[{"name":"Cleanvoice","role":"filler, mouth-noise and noise cleanup","affiliate_url":"https://example.com/aff/cleanvoice","monthly_price_usd":11,"retailer":"vendor"},
   {"name":"Auphonic","role":"leveling, loudness and noise reduction","affiliate_url":"https://example.com/aff/auphonic","monthly_price_usd":11,"retailer":"vendor"}]',
 false, 'Draft: confirm both prices and that Cleanvoice and Auphonic affiliate programs approved you')
on conflict (slug) do nothing;

select public.sync_tracked_products();
update public.tracked_products set retailer = 'vendor' where slug in ('cleanvoice', 'auphonic') and retailer is null;
