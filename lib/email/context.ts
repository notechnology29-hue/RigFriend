import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkChain, findFixes, type CheckResult, type Fix, type GearItem } from "@/lib/gear";

export type Lead = {
  id: string;
  email: string;
  source_tool: "roi_calculator" | "bottleneck_checker";
  build: Record<string, unknown>;
  unsubscribe_token: string;
  marketing_consent: boolean;
  sequence_step: number;
};

type Tool = { name: string; role: string; affiliate_url: string; monthly_price_usd: number };

export type RoiCtx = {
  hours: number;
  rate: number;
  monthlyCost: number;
  bundle: { slug: string; name: string; monthly_price_usd: number; est_time_saved_pct: number; tools: Tool[] } | null;
  hoursSaved: number;
  net: number;
};

export type FreshBuild = {
  slug: string;
  name: string;
  components: { name: string; retailer?: string | null }[];
  cash_price_usd: number;
  installment_months: number | null;
  installment_retailer: string | null;
  installment_monthly_usd: number | null;
  price_checked_at: string | null;
};

export type GearCtx = {
  mic: GearItem;
  iface: GearItem | null;
  booster: boolean;
  people: number;
  result: CheckResult;
  fixes: Fix[];
  freshBuild: FreshBuild | null;
};

export type EmailCtx = {
  lead: Lead;
  siteUrl: string;
  unsubscribePageUrl: string;
  unsubscribeOneClickUrl: string;
  mailingAddress: string;
  roi?: RoiCtx;
  gear?: GearCtx;
};

const WEEKS_PER_MONTH = 52 / 12;
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

export async function loadContext(lead: Lead): Promise<EmailCtx> {
  const siteUrl = (process.env.SITE_URL ?? "https://rigfriend.com").replace(/\/$/, "");
  const ctx: EmailCtx = {
    lead,
    siteUrl,
    unsubscribePageUrl: `${siteUrl}/unsubscribe?token=${lead.unsubscribe_token}`,
    unsubscribeOneClickUrl: `${siteUrl}/api/unsubscribe?token=${lead.unsubscribe_token}`,
    mailingAddress: process.env.MAILING_ADDRESS ?? "",
  };
  const db = supabaseAdmin();

  if (lead.source_tool === "roi_calculator") {
    const hours = num(lead.build.hours, 10);
    const rate = num(lead.build.rate, 50);
    const monthlyCost = hours * WEEKS_PER_MONTH * rate;
    const { data } = await db
      .from("saas_bundles")
      .select("slug, name, monthly_price_usd, est_time_saved_pct, tools")
      .eq("slug", String(lead.build.bundleSlug ?? ""))
      .eq("is_active", true) // service role bypasses RLS, so filter by hand
      .maybeSingle();
    const bundle = data ? { ...data, monthly_price_usd: Number(data.monthly_price_usd), est_time_saved_pct: Number(data.est_time_saved_pct) } : null;
    const hoursSaved = bundle ? hours * WEEKS_PER_MONTH * bundle.est_time_saved_pct : 0;
    const net = bundle ? hoursSaved * rate - bundle.monthly_price_usd : 0;
    ctx.roi = { hours, rate, monthlyCost, bundle: bundle as RoiCtx["bundle"], hoursSaved, net };
    return ctx;
  }

  // Gear check: recompute from the saved choices, so the email reflects today's catalog.
  const { data: gearRows } = await db.from("gear_items").select("*").eq("is_active", true);
  const catalog = (gearRows ?? []) as GearItem[];
  const mic = catalog.find((g) => g.slug === lead.build.micSlug && g.kind === "mic");
  if (!mic) return ctx;
  const iface = catalog.find((g) => g.slug === lead.build.ifaceSlug && g.kind === "interface") ?? null;
  const boosterItem = lead.build.booster ? catalog.find((g) => g.kind === "booster") ?? null : null;
  const people = Math.min(4, Math.max(1, num(lead.build.people, 1)));
  const result = checkChain(mic, iface, boosterItem, people);
  const fixes = findFixes(mic, iface, boosterItem, people, catalog);

  let freshBuild: FreshBuild | null = null;
  if (result.status !== "ok") {
    const type = !mic.is_generic && mic.mic_type !== "usb" ? mic.mic_type : null;
    let q = db
      .from("hardware_bundles_with_installments")
      .select("slug, name, components, cash_price_usd, installment_months, installment_retailer, installment_monthly_usd, price_checked_at")
      .eq("is_active", true)
      .in("category", ["mic_chain", "field_recorder", "stream_desk"])
      .gte("people_count", people)
      .order("cash_price_usd")
      .limit(1);
    if (type) q = q.eq("mic_type", type);
    const { data } = await q;
    freshBuild = (data?.[0] as FreshBuild) ?? null;
  }

  ctx.gear = { mic, iface, booster: Boolean(boosterItem), people, result, fixes, freshBuild };
  return ctx;
}
