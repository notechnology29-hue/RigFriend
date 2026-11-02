import { createClient } from "@supabase/supabase-js";
import { demo, demoEnabled } from "@/lib/demo";
import { supabasePublicKey, supabaseUrl } from "@/lib/supabase-env";

export type SoftwareBuild = {
  slug: string;
  name: string;
  use_case: string;
  description: string | null;
  monthly_price_usd: number;
  est_time_saved_pct: number;
  price_checked_at: string | null;
  compatibility_tags: Record<string, unknown>;
  tools: { name: string; role: string; affiliate_url: string; monthly_price_usd: number; retailer?: string | null }[];
  updated_at?: string;
};

export type GearBuild = {
  slug: string;
  name: string;
  people_count: number;
  category: string;
  description: string | null;
  cash_price_usd: number;
  installment_months: number | null;
  installment_retailer: string | null;
  installment_monthly_usd: number | null;
  mic_type: string | null;
  requires_phantom_power: boolean;
  min_preamp_gain_db: number | null;
  interface_max_gain_db: number | null;
  inline_preamp_gain_db: number;
  interface_has_phantom: boolean;
  signal_chain_rules: Record<string, unknown>;
  price_checked_at: string | null;
  components: { name: string; role: string; affiliate_url: string; price_usd: number; retailer?: string | null }[];
  updated_at?: string;
};

const SOFTWARE_COLS =
  "slug, name, use_case, description, monthly_price_usd, est_time_saved_pct, price_checked_at, compatibility_tags, tools, updated_at";
const GEAR_COLS =
  "slug, name, people_count, category, description, cash_price_usd, installment_months, installment_retailer, installment_monthly_usd, mic_type, requires_phantom_power, min_preamp_gain_db, interface_max_gain_db, inline_preamp_gain_db, interface_has_phantom, signal_chain_rules, price_checked_at, components, updated_at";

function client() {
  const url = supabaseUrl();
  const key = supabasePublicKey();
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function getAllBuilds(): Promise<{ software: SoftwareBuild[]; gear: GearBuild[] }> {
  const db = client();
  if (!db) {
    if (!demoEnabled()) return { software: [], gear: [] };
    const by = (k: string) => (a: Record<string, unknown>, b: Record<string, unknown>) => Number(a[k]) - Number(b[k]);
    return {
      software: [...demo.saasBundles()].sort(by("monthly_price_usd")) as SoftwareBuild[],
      gear: [...demo.hardwareBundles()].sort(by("cash_price_usd")) as GearBuild[],
    };
  }
  const [s, g] = await Promise.all([
    db.from("saas_bundles").select(SOFTWARE_COLS).eq("is_active", true).order("monthly_price_usd"),
    db.from("hardware_bundles_with_installments").select(GEAR_COLS).eq("is_active", true).order("cash_price_usd"),
  ]);
  if (s.error) console.error("Could not load software builds:", s.error.message);
  if (g.error) console.error("Could not load gear builds:", g.error.message);
  return { software: (s.data ?? []) as SoftwareBuild[], gear: (g.data ?? []) as GearBuild[] };
}

export async function getSoftwareBuild(slug: string): Promise<SoftwareBuild | null> {
  const db = client();
  if (!db) return demoEnabled() ? ((demo.saasBundles().find((b) => b.slug === slug) as SoftwareBuild) ?? null) : null;
  const { data } = await db.from("saas_bundles").select(SOFTWARE_COLS).eq("slug", slug).eq("is_active", true).maybeSingle();
  return (data as SoftwareBuild) ?? null;
}

export async function getGearBuild(slug: string): Promise<GearBuild | null> {
  const db = client();
  if (!db) return demoEnabled() ? ((demo.hardwareBundles().find((b) => b.slug === slug) as GearBuild) ?? null) : null;
  const { data } = await db.from("hardware_bundles_with_installments").select(GEAR_COLS).eq("slug", slug).eq("is_active", true).maybeSingle();
  return (data as GearBuild) ?? null;
}

// ---------- Display helpers ----------

export const usd = (n: number) =>
  Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: Number(n) % 1 ? 2 : 0 });

export const checkedLabel = (iso: string | null) =>
  iso ? `Prices checked ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : null;

export const USE_CASE_LABELS: Record<string, string> = {
  podcast: "Podcast", youtube: "YouTube", short_form: "Short clips", live_stream: "Live streams",
  courses: "Courses", lead_gen: "Business content", localization: "Other languages", voiceover: "Voiceover", music: "Music",
  faceless: "Faceless channel", agency: "Client work", network: "Media network",
};

// Plain-English notes for known compatibility flags. Unknown flags are skipped.
// VERIFY each claim against the vendor's docs before a build goes live.
const SOFTWARE_NOTES: Record<string, string> = {
  cloud_multicast: "You stream once and the service copies it to every platform, so your upload speed isn’t split between them.",
  live_stream_whitelisting: "The music is cleared for live streams, so your VODs don’t get muted.",
  native_elevenlabs_api: "The voice clone plugs straight into the avatar tool.",
  native_course_video: "Course videos are hosted inside the community platform, so there’s no separate video host to pay for.",
  xml_timeline_export: "The rough cut exports to Premiere Pro, DaVinci Resolve or Final Cut Pro, so you keep your editor.",
  native_kit_integration: "Leads from DMs go straight into your email list without a paid connector.",
  srt_export: "Exports caption files that keep translated audio in sync.",
  direct_descript_sync: "Recordings go straight from Riverside into Descript for editing.",
  multi_show_rss: "One hosting plan covers several shows, each with its own feed.",
  monetization_cleared: "The music and footage are licensed for monetized channels.",
  dynamic_ads: "Ads can be inserted into episodes automatically, including older ones.",
  ad_network_access: "The newsletter can earn from a built-in ad network.",
  wav_24bit_support: "Works in full-quality 24-bit WAV, so nothing gets squashed into MP3 along the way.",
  filler_and_noise_cleanup: "One upload removes filler words, mouth clicks, long pauses and background noise.",
  auto_leveling: "Evens out the volume between voices and sets the loudness podcast apps expect.",
};

export function softwareNotes(tags: Record<string, unknown>): string[] {
  return Object.entries(tags ?? {})
    .filter(([k, v]) => v === true && SOFTWARE_NOTES[k])
    .map(([k]) => SOFTWARE_NOTES[k]);
}

export function gearNotes(rules: Record<string, unknown>): string[] {
  const r = rules ?? {};
  const notes: string[] = [];
  if (r.aa_battery_portable) notes.push("Runs on AA batteries, so it records anywhere.");
  if (r.usb_c_power_bank_ready) notes.push("Also runs from a USB-C power bank.");
  if (typeof r.headphone_outputs === "number") notes.push(`${r.headphone_outputs} headphone outputs with their own volume, so you don’t need a splitter.`);
  if (r.internal_32bit_float) notes.push("Records a 32-bit float backup inside the transmitter, so a sudden shout can be rescued in editing.");
  if (typeof r.battery_hours === "number") notes.push(`About ${r.battery_hours} hours on a charge.`);
  if (typeof r.weight_lbs === "number") notes.push(`Weighs about ${r.weight_lbs} lb.`);
  if (r.wireless_handheld) notes.push("Wireless handheld mic, so there’s no cable to trip over.");
  if (r.proximity_effect_free) notes.push("Your voice stays even when you turn your head, which suits hosts who look between screens.");
  if (r.hardware_mixer_dials) notes.push("Physical dials for your mic, game and chat levels.");
  if (r.wave_link_mixing) notes.push("The interface works with Elgato’s free Wave Link mixer, and the Stream Deck’s dials control it, so your mic, music and chat each get their own knob.");
  if (r.onboard_analog_compressor) notes.push("Built-in analog compression, so vocals come in polished without using your computer’s power.");
  if (r.five_pin_midi_io) notes.push("Standard MIDI ports connect the controller and interface directly.");
  if (typeof r.built_in_mic_preamp_db === "number") notes.push(`The mic has its own +${r.built_in_mic_preamp_db} dB preamp, powered by the interface’s phantom power, so there’s no separate booster to buy.`);
  if (r.closed_back_monitoring) notes.push("Closed-back headphones keep what you hear from bleeding into the mic.");
  if (r.quiet_room_only) notes.push("Condenser mics hear the whole room, so this build is for a quiet, soft-furnished space. In a noisy room, pick a dynamic-mic build.");
  if (r.all_in_one_pack) notes.push("Interface, mic and headphones come in one box, so there’s nothing to match up.");
  if (r.onboard_dsp) notes.push("Built-in processing evens out your level and cuts background noise over USB, with no interface needed.");
  if (r.xlr_upgrade_ready) notes.push("It also has an XLR output for later, but that route needs an interface with plenty of gain, and the built-in processing only works over USB.");
  if (r.mix_minus_calls) notes.push("Phone and Bluetooth guests can join without hearing their own echo.");
  if (r.dual_usb) notes.push("Two USB-C ports, so one console can feed a recording laptop and a streaming computer at once.");
  if (r.built_in_usb_interface) notes.push("Records straight into your DAW over USB, so there’s no separate interface to buy.");
  if (r.vocal_xlr_input) notes.push("A mic input with vocal effects runs guitar and vocals through one unit.");
  if (r.amp_cloning) notes.push("Captures the sound of your own amp and pedals as presets.");
  return notes;
}
