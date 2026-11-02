// Pure compatibility logic for the gear bottleneck checker. No React, no network.

export type MicType = "dynamic" | "condenser" | "usb" | "ribbon";

export type GearItem = {
  slug: string;
  name: string;
  kind: "mic" | "interface" | "booster";
  mic_type: MicType | null;
  needs_phantom: boolean;
  gain_needed_db: number | null;
  max_gain_db: number | null;
  has_phantom: boolean | null;
  mic_inputs: number | null;
  boost_db: number | null;
  is_generic: boolean;
  sold_new: boolean;
  price_usd: number | null;
  price_checked_at: string | null;
  affiliate_url: string | null;
  retailer?: string | null;
};

export type Issue = { kind: "no_interface" | "phantom" | "booster_power" | "booster_blocks_phantom" | "gain" | "inputs" | "usb_multi"; message: string };

export type CheckResult = {
  status: "ok" | "tight" | "problem";
  needed: number | null;     // dB the mic needs
  available: number | null;  // dB the chain provides (interface + booster)
  headroom: number | null;
  issues: Issue[];
  notes: string[];
};

export const COMFORT_DB = 6; // below this much spare gain, budget preamps get noisy near the top of the knob

export function checkChain(mic: GearItem, iface: GearItem | null, booster: GearItem | null, people: number): CheckResult {
  const issues: Issue[] = [];
  const notes: string[] = [];

  if (mic.mic_type === "usb") {
    if (people > 1) {
      issues.push({ kind: "usb_multi", message: `Recording ${people} people on USB mics into one computer is unreliable. Most people switch to XLR mics and an interface with ${people} inputs.` });
    } else {
      notes.push("USB mics plug straight into your computer, so there’s no interface or gain chain to check.");
    }
    if (iface) notes.push("A USB mic doesn’t use your interface’s preamp, so the interface won’t change how it sounds.");
    return { status: issues.length ? "problem" : "ok", needed: null, available: null, headroom: null, issues, notes };
  }

  if (!iface) {
    issues.push({ kind: "no_interface", message: "An XLR mic needs an audio interface or mixer between it and your computer." });
    return { status: "problem", needed: mic.gain_needed_db, available: null, headroom: null, issues, notes };
  }

  if (mic.needs_phantom && !iface.has_phantom) {
    issues.push({ kind: "phantom", message: `${mic.name} needs 48V phantom power, and ${iface.name} doesn’t supply it. You’ll get no sound at all.` });
  }

  // Inline boosters use the phantom power themselves and don't pass it on to the mic.
  if (booster && mic.needs_phantom) {
    issues.push({ kind: "booster_blocks_phantom", message: `Inline boosters don’t pass phantom power through, so ${mic.name} won’t get the power it needs behind one. Plug it straight into the interface instead.` });
  }

  const boost = booster && iface.has_phantom && !mic.needs_phantom ? booster.boost_db ?? 0 : 0;
  if (booster && !iface.has_phantom) {
    issues.push({ kind: "booster_power", message: `Inline boosters run on phantom power, and ${iface.name} doesn’t supply it, so the booster won’t pass any sound.` });
  }

  const needed = mic.gain_needed_db;
  const available = (iface.max_gain_db ?? 0) + boost;
  const headroom = needed == null ? null : available - needed;

  if (headroom != null && headroom < 0) {
    issues.push({ kind: "gain", message: `About ${-headroom} dB short. You’ll max out the gain knob and still sound quiet, and turning it up in software adds hiss.` });
  }

  const inputs = iface.mic_inputs ?? 1;
  if (people > inputs) {
    issues.push({ kind: "inputs", message: `${iface.name} has ${inputs} mic input${inputs === 1 ? "" : "s"}, and you need ${people}.` });
  }

  let status: CheckResult["status"] = issues.length ? "problem" : "ok";
  if (status === "ok" && headroom != null && headroom < COMFORT_DB) {
    status = "tight";
    notes.push(`It works, with ${headroom} dB to spare. That puts the knob near the top, where budget preamps get noisy.`);
  }
  if (status === "ok") notes.push(headroom != null ? `${headroom} dB of headroom. You can keep the knob in its clean range.` : "This chain works.");

  return { status, needed, available, headroom, issues, notes };
}

export type Fix =
  | { type: "remove_booster"; item: GearItem; result: CheckResult }
  | { type: "booster"; item: GearItem; result: CheckResult }
  | { type: "interface"; item: GearItem; result: CheckResult };

/** Cheapest fix first: a booster if it solves everything, else the cheapest interface that does. */
export function findFixes(mic: GearItem, iface: GearItem | null, booster: GearItem | null, people: number, catalog: GearItem[]): Fix[] {
  const current = checkChain(mic, iface, booster, people);
  if (current.status === "ok" || mic.mic_type === "usb") return [];
  const fixes: Fix[] = [];
  const byPrice = (a: GearItem, b: GearItem) => (a.price_usd ?? Infinity) - (b.price_usd ?? Infinity);

  // Free fix first: if the booster itself is the problem, take it out.
  if (booster) {
    const without = checkChain(mic, iface, null, people);
    if (without.status === "ok") return [{ type: "remove_booster", item: booster, result: without }];
  }

  if (iface && !booster) {
    const boosterFix = catalog
      .filter((g) => g.kind === "booster" && g.sold_new)
      .sort(byPrice)
      .map((b) => ({ item: b, result: checkChain(mic, iface, b, people) }))
      .find((f) => f.result.status === "ok");
    if (boosterFix) fixes.push({ type: "booster", ...boosterFix });
  }

  const ifaceFix = catalog
    .filter((g) => g.kind === "interface" && g.sold_new && g.slug !== iface?.slug)
    .sort(byPrice)
    .map((i) => ({ item: i, result: checkChain(mic, i, null, people) }))
    .find((f) => f.result.status === "ok");
  if (ifaceFix) fixes.push({ type: "interface", ...ifaceFix });

  return fixes;
}
