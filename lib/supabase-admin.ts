import { createClient } from "@supabase/supabase-js";
import { supabaseSecretKey, supabaseUrl } from "@/lib/supabase-env";

// Server-only: uses the secret key, which bypasses row-level security.
// Never import this from a "use client" file.
export function supabaseAdmin() {
  const url = supabaseUrl();
  const key = supabaseSecretKey();
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  return createClient(url, key, { auth: { persistSession: false } });
}
