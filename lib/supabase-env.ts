// Supabase connection settings. Supabase renamed its keys (anon -> publishable,
// service_role -> secret); both the new and old variable names work here.

export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL;

/** Publishable key (sb_publishable_...): read-only access that row-level security allows. */
export const supabasePublicKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Secret key (sb_secret_...): bypasses row-level security. Server only. */
export const supabaseSecretKey = () =>
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
