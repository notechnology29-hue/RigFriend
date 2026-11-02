-- =============================================================
-- 003: seed bundles 6–10 (SaaS + hardware)
-- Prices and commission rates come from planning notes and are NOT verified.
-- price_checked_at / terms_checked_at stay null until you confirm each one.
-- Affiliate URLs are placeholders: replace with your tracked links.
-- =============================================================

-- ---------- SaaS bundles 6–10 ----------
insert into public.saas_bundles
  (slug, name, use_case, description, monthly_price_usd, est_time_saved_pct, export_resolution,
   bottleneck, budget_tier, compatibility_tags, tools)
values
('multistream-live-show', 'Multi-stream live show stack', 'live_stream',
 'Stream once to YouTube, Twitch, Kick, X and LinkedIn, then turn the VOD into vertical clips.',
 62.99, 0.30, '1080p', 'multi_platform_reach', 'under_75',
 '{"cloud_multicast": true, "live_stream_whitelisting": true}',
 '[{"name":"Restream","role":"multistream","affiliate_url":"https://example.com/aff/restream","monthly_price_usd":19},
   {"name":"Streamlabs Ultra","role":"broadcast","affiliate_url":"https://example.com/aff/streamlabs","monthly_price_usd":19},
   {"name":"OpusClip","role":"repurpose","affiliate_url":"https://example.com/aff/opusclip","monthly_price_usd":15},
   {"name":"Epidemic Sound","role":"music","affiliate_url":"https://example.com/aff/epidemic","monthly_price_usd":9.99}]'),

('ai-avatar-course-machine', 'AI avatar course & community', 'courses',
 'Clone your face and voice for lessons, record screen walkthroughs, and host a paid community.',
 158.00, 0.45, '1080p', 'on_camera_time', 'pro',
 '{"native_elevenlabs_api": true, "native_course_video": true}',
 '[{"name":"HeyGen","role":"avatar video","affiliate_url":"https://example.com/aff/heygen","monthly_price_usd":29},
   {"name":"Tella","role":"screen recording","affiliate_url":"https://example.com/aff/tella","monthly_price_usd":19},
   {"name":"ElevenLabs","role":"voice clone","affiliate_url":"https://example.com/aff/elevenlabs","monthly_price_usd":11},
   {"name":"Skool","role":"community + courses","affiliate_url":"https://example.com/aff/skool","monthly_price_usd":99}]'),

('youtube-packaging-roughcut', 'YouTube packaging & rough-cut stack', 'youtube',
 'Cut bad takes and silences automatically, then package with stronger titles and thumbnails.',
 65.49, 0.35, '4k', 'rough_cut_and_ctr', 'under_75',
 '{"xml_timeline_export": true}',
 '[{"name":"Gling","role":"rough cut","affiliate_url":"https://example.com/aff/gling","monthly_price_usd":15},
   {"name":"vidIQ","role":"titles + research","affiliate_url":"https://example.com/aff/vidiq","monthly_price_usd":16.50},
   {"name":"1of10","role":"thumbnail ideas","affiliate_url":"https://example.com/aff/1of10","monthly_price_usd":19},
   {"name":"Artlist","role":"music + SFX","affiliate_url":"https://example.com/aff/artlist","monthly_price_usd":14.99}]'),

('dm-leadgen-funnel', 'DM lead-gen & short-form funnel', 'lead_gen',
 'Publish captioned reels, auto-reply to comments by DM, and send leads into an email sequence.',
 81.00, 0.30, '1080p', 'lead_capture', 'under_100',
 '{"native_kit_integration": true}',
 '[{"name":"Submagic","role":"captions + b-roll","affiliate_url":"https://example.com/aff/submagic","monthly_price_usd":19},
   {"name":"Manychat","role":"DM automation","affiliate_url":"https://example.com/aff/manychat","monthly_price_usd":15},
   {"name":"Metricool","role":"scheduling","affiliate_url":"https://example.com/aff/metricool","monthly_price_usd":18},
   {"name":"Kit","role":"email","affiliate_url":"https://example.com/aff/kit","monthly_price_usd":29}]'),

('global-ai-dubbing', 'Global AI dubbing suite', 'localization',
 'Translate and voice-clone existing videos into other languages with lip sync.',
 108.00, 0.40, '4k', 'international_scale', '100_plus',
 '{"srt_export": true}',
 '[{"name":"Rask AI","role":"dubbing","affiliate_url":"https://example.com/aff/rask","monthly_price_usd":60},
   {"name":"Descript","role":"edit + SRT","affiliate_url":"https://example.com/aff/descript","monthly_price_usd":24},
   {"name":"Captions","role":"lip sync + eye contact","affiliate_url":"https://example.com/aff/captions","monthly_price_usd":24}]');

-- ---------- Hardware bundles 6–10 ----------
insert into public.hardware_bundles
  (slug, name, people_count, category, environment, description, cash_price_usd,
   installment_months, installment_retailer, budget_min_usd, budget_max_usd,
   mic_type, requires_phantom_power, min_preamp_gain_db, interface_max_gain_db,
   inline_preamp_gain_db, interface_has_phantom, signal_chain_rules, components, is_active, review_note)
values
('four-mic-field-podcast', '4-mic portable field podcast rig', 4, 'field_recorder', 'mobile_untreated',
 'Battery-powered 4-input recorder with separate headphone mixes, plus four dynamic mics.',
 493.00, null, null, 450, 500,
 'dynamic', false, 55, 70, 0, false,
 '{"aa_battery_portable": true, "usb_c_power_bank_ready": true, "headphone_outputs": 4}',
 '[{"name":"Zoom PodTrak P4","role":"recorder","affiliate_url":"https://example.com/aff/p4","price_usd":149},
   {"name":"Dynamic XLR mic x4","role":"mic","affiliate_url":"https://example.com/aff/dyn","price_usd":344}]',
 true, null),

('street-interview-wireless', 'Street interview wireless kit', 2, 'wireless_lav', 'loud_outdoor',
 'Two-person wireless kit with 32-bit float onboard backup for loud, unpredictable locations.',
 349.00, null, null, 130, 350,
 null, false, null, null, 0, true,
 '{"internal_32bit_float": true, "onboard_backup": true, "light_alt_slug": "street-interview-mini"}',
 '[{"name":"DJI Mic 2 (2-person)","role":"wireless system","affiliate_url":"https://example.com/aff/djimic2","price_usd":349}]',
 true, null),

('popup-venue-pa', 'Pop-up live show PA rig', 1, 'live_pa', 'venue_50_150',
 'Battery PA with a 3-channel mixer and a wireless handheld vocal mic.',
 1028.00, 12, 'zZounds', 975, 1030,
 null, false, null, null, 0, true,
 '{"battery_hours": 11, "weight_lbs": 14, "wireless_handheld": true}',
 '[{"name":"Bose S1 Pro+","role":"PA","affiliate_url":"https://example.com/aff/s1pro","price_usd":699},
   {"name":"Shure BLX24/SM58","role":"wireless mic","affiliate_url":"https://example.com/aff/blx24","price_usd":329}]',
 true, null),

('talk-radio-stream-desk', 'Talk-radio & stream control desk', 1, 'stream_desk', 'multi_monitor_desk',
 'Broadcast dynamic that stays consistent off-axis, plus a hardware control surface.',
 628.99, 8, 'zZounds', 625, 860,
 'dynamic', false, 60, null, 0, false,
 '{"proximity_effect_free": true, "hardware_mixer_dials": true}',
 '[{"name":"Electro-Voice RE20","role":"mic","affiliate_url":"https://example.com/aff/re20","price_usd":449},
   {"name":"Elgato Stream Deck +","role":"control surface","affiliate_url":"https://example.com/aff/sdplus","price_usd":179.99}]',
 false, 'No audio interface: the RE20 is XLR and needs roughly 60 dB of clean gain. Add an interface or mixer before publishing.'),

('analog-beatmaker', 'Analog-warmth beatmaker rig', 1, 'production', 'desktop_home_studio',
 'Interface with onboard analog compression and a 37-key controller with drum pads.',
 438.00, null, null, 400, 450,
 null, false, null, null, 0, true,
 '{"onboard_analog_compressor": true, "five_pin_midi_io": true}',
 '[{"name":"Universal Audio Volt 276","role":"interface","affiliate_url":"https://example.com/aff/volt276","price_usd":299},
   {"name":"Akai MPK Mini Plus","role":"controller","affiliate_url":"https://example.com/aff/mpkplus","price_usd":139}]',
 true, null);

-- ---------- Private commission estimates (service role only) ----------
insert into public.bundle_economics (bundle_slug, niche, upfront_cpa_usd, recurring_usd_mo, notes) values
('multistream-live-show',     'saas',     35.00,  9.45, 'Streamlabs + Epidemic are CPA; check overlap, Streamlabs Ultra already multistreams'),
('ai-avatar-course-machine',  'saas',      0.00, 53.52, 'HeyGen recurring is 12 months only'),
('youtube-packaging-roughcut','saas',     30.00, 12.62, 'Artlist CPA on annual billing only'),
('dm-leadgen-funnel',         'saas',     65.00, 14.40, 'Kit recurring capped at 24 months'),
('global-ai-dubbing',         'saas',      0.00, 20.40, null),
('four-mic-field-podcast',    'hardware', 20.00,  0.00, 'midpoint of 10–30'),
('street-interview-wireless', 'hardware', 21.00,  0.00, null),
('popup-venue-pa',            'hardware', 60.00,  0.00, 'midpoint of 58–62'),
('talk-radio-stream-desk',    'hardware', 41.50,  0.00, 'midpoint of 35–48'),
('analog-beatmaker',          'hardware', 24.00,  0.00, 'midpoint of 22–26');
