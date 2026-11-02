-- =============================================================
-- 016: let the public site read the catalog through the Data API
-- Newer Supabase projects don't always grant new tables to the API roles
-- automatically. Row-level security (001, 005) still limits reads to active rows.
-- Leads, review queue and admin tables stay server-only (service role).
-- =============================================================

grant usage on schema public to anon, authenticated;

grant select on public.saas_bundles                       to anon, authenticated;
grant select on public.hardware_bundles                   to anon, authenticated;
grant select on public.hardware_bundles_with_installments to anon, authenticated;
grant select on public.gear_items                         to anon, authenticated;
