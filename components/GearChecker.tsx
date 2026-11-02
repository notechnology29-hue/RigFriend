"use client";

import { useMemo, useState } from "react";
import { checkChain, findFixes, type GearItem } from "@/lib/gear";
import SaveBuildModal from "@/components/SaveBuildModal";
import { bundlePriceVisible, buyLabel, canShowPrice, zzoundsPaymentPlanLine } from "@/lib/retailers";
import type { RescueStack } from "@/lib/bundles";

export type HardwareBundle = {
  slug: string;
  name: string;
  people_count: number;
  mic_type: string | null;
  cash_price_usd: number;
  installment_months: number | null;
  installment_retailer: string | null;
  installment_monthly_usd: number | null;
  price_checked_at: string | null;
  components: { name: string; affiliate_url: string; retailer?: string | null }[];
};

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 });
const checked = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const HEADLINES = {
  ok: "No bottleneck. You’re good.",
  tight: "It works, but it’s tight.",
  problem: "Found the bottleneck.",
} as const;

function GainMeter({ label, value, max, tone }: { label: string; value: number; max: number; tone: "neutral" | "good" | "bad" }) {
  const color = tone === "good" ? "bg-savings" : tone === "bad" ? "bg-overload" : "bg-ink";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4 text-sm text-ink-muted">
        <span>{label}</span>
        <span className="font-display text-2xl font-semibold tabular-nums text-ink">{value} dB</span>
      </div>
      <div className="relative h-5 overflow-hidden rounded-control bg-line" role="img" aria-label={`${label}: ${value} dB`}>
        <div className={`h-full ${color} transition-[width] duration-300`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_12px,var(--paper)_12px_16px)]" />
      </div>
    </div>
  );
}

function BuyLink({ item }: { item: GearItem }) {
  if (!item.affiliate_url) return null;
  return (
    <a
      href={item.affiliate_url} target="_blank" rel="sponsored noopener" referrerPolicy="no-referrer-when-downgrade"
      className="inline-flex min-h-11 shrink-0 items-center rounded-control bg-signal px-4 text-sm font-medium text-on-signal hover:bg-signal-hover"
    >
      {item.price_usd != null && item.price_checked_at && canShowPrice(item.retailer)
        ? `${usd(item.price_usd)}, ${buyLabel(item.retailer).replace("See it at ", "at ")}`
        : buyLabel(item.retailer)}
    </a>
  );
}

export default function GearChecker({ catalog, bundles, rescue = null }: { catalog: GearItem[]; bundles: HardwareBundle[]; rescue?: RescueStack | null }) {
  const mics = catalog.filter((g) => g.kind === "mic");
  const interfaces = catalog.filter((g) => g.kind === "interface");
  const booster = catalog.find((g) => g.kind === "booster") ?? null;

  const [micSlug, setMicSlug] = useState("");
  const [ifaceSlug, setIfaceSlug] = useState("");
  const [useBooster, setUseBooster] = useState(false);
  const [people, setPeople] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const mic = mics.find((m) => m.slug === micSlug) ?? null;
  const iface = interfaces.find((i) => i.slug === ifaceSlug) ?? null;
  const isUsb = mic?.mic_type === "usb";
  const activeBooster = useBooster && !isUsb && iface ? booster : null;

  const result = useMemo(() => (mic ? checkChain(mic, iface, activeBooster, people) : null), [mic, iface, activeBooster, people]);
  const fixes = useMemo(() => (mic ? findFixes(mic, iface, activeBooster, people, catalog) : []), [mic, iface, activeBooster, people, catalog]);

  const freshBuild = useMemo(() => {
    if (!result || result.status === "ok") return null;
    const type = mic && !mic.is_generic && !isUsb ? mic.mic_type : null;
    return bundles
      .filter((b) => b.people_count >= people && (!type || b.mic_type === type))
      .sort((a, b) => a.cash_price_usd - b.cash_price_usd)[0] ?? null;
  }, [result, bundles, people, mic, isUsb]);

  const selectClass =
    "mt-1 min-h-11 w-full rounded-control border border-control-border bg-paper px-3 text-base";

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pt-6 pb-10 sm:px-5 sm:pt-10">
      <h1 className="font-display text-5xl font-bold leading-[0.95] sm:text-6xl">Will this mic work with that interface?</h1>
      <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-ink-muted">
        Pick your mic and what it plugs into. You’ll see whether your gear has enough clean gain, and the cheapest fix if it doesn’t.
      </p>

      <div className="mt-6 grid gap-5 rounded-panel bg-panel p-6">
        <div>
          <label htmlFor="mic" className="text-sm text-ink-muted">Your mic</label>
          <select id="mic" value={micSlug} onChange={(e) => setMicSlug(e.target.value)} className={selectClass}>
            <option value="">Choose a mic</option>
            <optgroup label="Popular mics">
              {mics.filter((m) => !m.is_generic || m.mic_type === "usb").map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
            </optgroup>
            <optgroup label="Not listed? Pick the closest type">
              {mics.filter((m) => m.is_generic && m.mic_type !== "usb").map((m) => <option key={m.slug} value={m.slug}>{m.name.replace("Not listed: ", "")}</option>)}
            </optgroup>
          </select>
        </div>

        {!isUsb && (
          <div>
            <label htmlFor="iface" className="text-sm text-ink-muted">What it plugs into</label>
            <select id="iface" value={ifaceSlug} onChange={(e) => setIfaceSlug(e.target.value)} className={selectClass}>
              <option value="">Nothing yet</option>
              {interfaces.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
            </select>
          </div>
        )}

        {!isUsb && iface && booster && (
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={useBooster} onChange={(e) => setUseBooster(e.target.checked)} className="mt-0.5 size-5 accent-ink" />
            I already use an inline booster (like a Cloudlifter)
          </label>
        )}

        <fieldset>
          <legend className="text-sm text-ink-muted">People recording at once</legend>
          <div className="mt-1 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n} type="button" aria-pressed={people === n} onClick={() => setPeople(n)}
                className={`min-h-11 rounded-control border font-display text-xl font-semibold ${
                  people === n ? "border-ink bg-ink text-paper" : "border-control-border hover:border-ink"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {!result ? (
        <p className="mt-8 text-ink-muted">Choose your mic to start.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-6" aria-live="polite">
          <p className={`font-display text-4xl font-bold leading-tight ${result.status === "problem" ? "text-overload" : ""}`}>
            {HEADLINES[result.status]}
          </p>

          {result.needed != null && result.available != null && (
            <div className="flex flex-col gap-4">
              <GainMeter label="Gain your mic needs" value={result.needed} max={Math.max(80, result.needed, result.available)} tone="neutral" />
              <GainMeter
                label="Gain your setup gives"
                value={result.available}
                max={Math.max(80, result.needed, result.available)}
                tone={result.headroom != null && result.headroom >= 0 ? "good" : "bad"}
              />
            </div>
          )}

          {result.issues.length > 0 && (
            <ul className="flex flex-col gap-3">
              {result.issues.map((i) => (
                <li key={i.kind} className="leading-relaxed"><span className="font-medium text-overload">Problem: </span>{i.message}</li>
              ))}
            </ul>
          )}
          {result.notes.map((n) => <p key={n} className="leading-relaxed text-ink-muted">{n}</p>)}

          {fixes.length > 0 && (
            <div>
              <h2 className="font-display text-3xl font-bold">Cheapest fix first</h2>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {fixes.map((f) => (
                  <li key={f.item.slug} className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {f.type === "remove_booster" ? "Take out the inline booster" : f.type === "booster" ? `Add a ${f.item.name}` : `Switch to the ${f.item.name}`}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {f.result.headroom != null ? `Leaves ${f.result.headroom} dB of headroom.` : "Solves the problems above."}
                        {f.type === "booster" ? " Keeps the interface you have." : f.type === "remove_booster" ? " Costs nothing." : ""}
                      </p>
                    </div>
                    {f.type !== "remove_booster" && <BuyLink item={f.item} />}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rescue && (result.status === "tight" || result.issues.some((i) => i.kind === "gain")) && (
            // Only for gain problems: software can't add phantom power, inputs or a missing interface.
            <div className="rounded-panel border border-control-border p-6">
              <p className="text-sm text-ink-muted">Can’t upgrade yet?</p>
              <p className="mt-1 font-display text-3xl font-bold leading-tight">Clean it up after recording</p>
              <p className="mt-2 leading-relaxed text-ink-muted">
                Cleanup tools can cut the hiss from a maxed-out gain knob and even out your volume. It won’t sound as clean as fixing the gain, but it gets you by until you do.
              </p>
              <a href={`/builds/software/${rescue.slug}`}
                 className="mt-4 inline-flex min-h-11 items-center rounded-control border border-control-border px-4 text-sm hover:border-ink">
                See the cleanup stack{rescue.price_checked_at ? ` (${usd(Number(rescue.monthly_price_usd))}/mo)` : ""}
              </a>
            </div>
          )}

          {freshBuild && (
            <div className="rounded-panel bg-panel p-6">
              <p className="text-sm text-ink-muted">Or start fresh with a complete build</p>
              <p className="mt-1 font-display text-3xl font-bold">{freshBuild.name}</p>
              <p className="mt-2">
                {freshBuild.price_checked_at && bundlePriceVisible(freshBuild.components) ? (
                  <>
                    <span className="font-display text-2xl font-semibold tabular-nums">{usd(freshBuild.cash_price_usd)}</span>
                    <span className="mt-1 block text-sm text-ink-muted">Prices checked {checked(freshBuild.price_checked_at)}. Confirm on the store’s page before you buy.</span>
                  </>
                ) : (
                  <span className="text-ink-muted">Current prices are on each store’s page.</span>
                )}
                {zzoundsPaymentPlanLine(freshBuild.installment_retailer) && (
                  <span className="mt-1 block text-sm text-ink-muted">{zzoundsPaymentPlanLine(freshBuild.installment_retailer)}</span>
                )}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {freshBuild.components.map((c) => (
                  <li key={c.name}>
                    <a href={c.affiliate_url} target="_blank" rel="sponsored noopener" referrerPolicy="no-referrer-when-downgrade"
                       className="inline-flex min-h-11 items-center rounded-control border border-control-border px-3 text-sm hover:border-ink">
                      {c.name}{c.retailer && c.retailer !== "vendor" ? ` (${buyLabel(c.retailer).replace("See it at ", "")})` : ""}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button" onClick={() => setModalOpen(true)}
            className="min-h-11 self-start rounded-control bg-signal px-5 font-medium text-on-signal hover:bg-signal-hover"
          >
            Email me this setup check
          </button>

          <p className="text-sm leading-relaxed text-ink-muted">
            Gain figures come from makers’ spec sheets and a rule of thumb for spoken word a few inches from the mic. We earn a commission if you buy through these links, at no extra cost to you.
          </p>
        </div>
      )}

      {modalOpen && mic && (
        <SaveBuildModal
          onClose={() => setModalOpen(false)}
          sourceTool="bottleneck_checker"
          build={{ micSlug: mic.slug, ifaceSlug: iface?.slug ?? null, booster: Boolean(activeBooster), people }}
        />
      )}
    </section>
  );
}
