import data from "@/lib/demo-data.json";

// Local preview data: the active rows the migrations in supabase/migrations seed, exported once.
// Used only when Supabase isn't configured, and only in `next dev` (or with RIGFRIEND_DEMO=1),
// so a production deploy with missing env vars still shows empty states rather than stale data.
// Regenerate by running the migrations against a scratch database and exporting the active rows.
export const demoEnabled = () =>
  process.env.RIGFRIEND_DEMO === "1" || process.env.NODE_ENV === "development";

type Row = Record<string, unknown>;

export const demo = {
  saasBundles: () => data.saas_bundles as Row[],
  hardwareBundles: () => data.hardware_bundles as Row[],
  gearItems: () => data.gear_items as Row[],
};
