-- =============================================================
-- 008: new calculator categories. Run this ON ITS OWN, before 009:
-- Postgres can't use a new enum value in the same run that adds it.
-- =============================================================
alter type saas_use_case add value if not exists 'faceless';
alter type saas_use_case add value if not exists 'agency';
alter type saas_use_case add value if not exists 'network';
