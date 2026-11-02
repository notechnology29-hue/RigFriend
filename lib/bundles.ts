import { createClient } from "@supabase/supabase-js";
import type { SaasBundle } from "@/components/RoiCalculator";
import type { HardwareBundle } from "@/components/GearChecker";
import type { GearItem } from "@/lib/gear";
import { demo, demoEnabled } from "@/lib/demo";
import { supabasePublicKey, supabaseUrl } from "@/lib/supabase-env";

export async function getSaasBundles(): Promise<SaasBundle[]> {
  const url = supabaseUrl();
  const key = supabasePublicKey();
  if (!url || !key) {
    if (demoEnabled()) return demo.saasBundles() as SaasBundle[];
    console.error("Supabase env vars are missing; showing no bundles.");
    return [];
  }
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("saas_bundles")
    .select("id, slug, name, use_case, description, monthly_price_usd, est_time_saved_pct, export_resolution, tools")
    .eq("is_active", true);
  if (error) {
    console.error("Could not load bundles:", error.message);
    return [];
  }
  return (data ?? []) as SaasBundle[];
}

export type RescueStack = { slug: string; name: string; monthly_price_usd: number; price_checked_at: string | null };

export async function getGearData(): Promise<{ catalog: GearItem[]; bundles: HardwareBundle[]; rescue: RescueStack | null }> {
  const url = supabaseUrl();
  const key = supabasePublicKey();
  if (!url || !key) {
    if (demoEnabled()) {
      const chains = ["mic_chain", "field_recorder", "stream_desk"];
      return {
        catalog: demo.gearItems() as GearItem[],
        bundles: demo.hardwareBundles().filter((b) => chains.includes(String(b.category))) as HardwareBundle[],
        rescue: (demo.saasBundles().find((b) => b.slug === "audio-rescue-stack") as RescueStack) ?? null,
      };
    }
    console.error("Supabase env vars are missing; gear checker has no data.");
    return { catalog: [], bundles: [], rescue: null };
  }
  const supabase = createClient(url, key);
  const [gear, hw, rescue] = await Promise.all([
    supabase.from("gear_items").select("*").eq("is_active", true).order("sort_order"),
    supabase
      .from("hardware_bundles_with_installments")
      .select("slug, name, people_count, mic_type, cash_price_usd, installment_months, installment_retailer, installment_monthly_usd, price_checked_at, components, category")
      .eq("is_active", true)
      .in("category", ["mic_chain", "field_recorder", "stream_desk"]),
    supabase
      .from("saas_bundles")
      .select("slug, name, monthly_price_usd, price_checked_at")
      .eq("slug", "audio-rescue-stack")
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  if (gear.error) console.error("Could not load gear:", gear.error.message);
  if (hw.error) console.error("Could not load hardware bundles:", hw.error.message);
  return { catalog: (gear.data ?? []) as GearItem[], bundles: (hw.data ?? []) as HardwareBundle[], rescue: (rescue.data as RescueStack) ?? null };
}
