"use client";

/**
 * Editing cost calculator (Rigfriend).
 * Inputs are console-style faders; the result is two level meters — what editing
 * costs now vs. what the recommended stack costs. All colors, fonts and corners
 * come from the Rigfriend theme in app/globals.css, so dark mode works on its own.
 */

import { useMemo, useState } from "react";
import SaveBuildModal from "@/components/SaveBuildModal";

export type SaasTool = { name: string; role: string; affiliate_url: string; monthly_price_usd: number };
export type SaasBundle = {
  id: string;
  slug: string;
  name: string;
  use_case: string;
  description: string | null;
  monthly_price_usd: number;
  est_time_saved_pct: number;
  export_resolution: "720p" | "1080p" | "4k" | null;
  tools: SaasTool[];
};

const WEEKS_PER_MONTH = 52 / 12;
const DEFAULTS = { hours: 10, rate: 50 };
const USE_CASES = [
  { value: "podcast", label: "Podcast" },
  { value: "youtube", label: "YouTube" },
  { value: "short_form", label: "Short clips" },
  { value: "live_stream", label: "Live streams" },
  { value: "courses", label: "Courses" },
  { value: "lead_gen", label: "Business content" },
  { value: "localization", label: "Other languages" },
  { value: "faceless", label: "Faceless channel" },
  { value: "agency", label: "Client work" },
  { value: "network", label: "Media network" },
  { value: "music", label: "Music" },
];

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function score(bundle: SaasBundle, hoursPerWeek: number, rate: number) {
  const monthlyHours = hoursPerWeek * WEEKS_PER_MONTH;
  const hoursSaved = monthlyHours * bundle.est_time_saved_pct;
  const valueSaved = hoursSaved * rate;
  return { hoursSaved, net: valueSaved - bundle.monthly_price_usd };
}

function Fader(props: {
  id: string; label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={props.id} className="text-sm text-ink-muted">{props.label}</label>
        <output htmlFor={props.id} className="font-display text-3xl font-semibold tabular-nums">
          {props.display}
        </output>
      </div>
      <input
        id={props.id} type="range" min={props.min} max={props.max} step={props.step} value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="h-11 w-full cursor-pointer accent-signal"
      />
    </div>
  );
}

function Meter({ label, value, max, tone }: { label: string; value: number; max: number; tone: "cost" | "save" }) {
  const pct = Math.min(100, (value / Math.max(max, 1)) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4 text-sm text-ink-muted">
        <span>{label}</span>
        <span className="font-display text-2xl font-semibold tabular-nums text-ink">
          {usd(value)}<span className="text-base font-normal text-ink-muted">/mo</span>
        </span>
      </div>
      {/* Segmented meter: unlit segments in `line`, gaps cut out in `paper`. */}
      <div className="relative h-5 overflow-hidden rounded-control bg-line" role="img" aria-label={`${label}: ${usd(value)} per month`}>
        <div
          className={`h-full ${tone === "cost" ? "bg-overload" : "bg-savings"} transition-[width] duration-300`}
          style={{ width: `${pct}%` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_12px,var(--paper)_12px_16px)]" />
      </div>
    </div>
  );
}

export default function RoiCalculator({ bundles, initialUseCase }: { bundles: SaasBundle[]; initialUseCase?: string }) {
  const [hours, setHours] = useState(DEFAULTS.hours);
  const [rate, setRate] = useState(DEFAULTS.rate);
  const [useCase, setUseCase] = useState(
    initialUseCase && USE_CASES.some((u) => u.value === initialUseCase) ? initialUseCase : "podcast"
  );
  const [touched, setTouched] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const available = useMemo(
    () => USE_CASES.filter((u) => bundles.some((b) => b.use_case === u.value)),
    [bundles]
  );

  const result = useMemo(() => {
    const pool = bundles.filter((b) => b.use_case === useCase);
    const candidates = pool.length ? pool : bundles;
    if (!candidates.length) return null;
    return candidates
      .map((b) => ({ bundle: b, ...score(b, hours, rate) }))
      .sort((a, b) => b.net - a.net)[0];
  }, [bundles, hours, rate, useCase]);

  const laborCost = hours * WEEKS_PER_MONTH * rate;
  const firstTool = result?.bundle.tools[0];

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pt-6 pb-10 sm:px-5 sm:pt-10">
      <h1 className="font-display text-5xl font-bold leading-[0.95] sm:text-6xl">Is editing eating your week?</h1>
      <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-ink-muted">
        Set your hours and what your time is worth. You’ll see what editing costs you each month next to the AI stack that cuts it most.
      </p>

      {available.length > 1 && (
        <fieldset className="mt-6">
          <legend className="mb-2 text-sm text-ink-muted">What do you make?</legend>
          <div className="flex flex-wrap gap-2">
            {available.map((u) => (
              <button
                key={u.value} type="button" aria-pressed={useCase === u.value}
                onClick={() => { setUseCase(u.value); setTouched(true); }}
                className={`min-h-11 rounded-control border px-4 text-sm transition-colors ${
                  useCase === u.value
                    ? "border-ink bg-ink text-paper"
                    : "border-control-border hover:border-ink"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-6 grid gap-6 rounded-panel bg-panel p-6 sm:grid-cols-2">
        <Fader id="hours" label="Hours you edit per week" value={hours} min={1} max={40} step={1}
               display={`${hours} h`} onChange={(v) => { setHours(v); setTouched(true); }} />
        <Fader id="rate" label="What your hour is worth" value={rate} min={15} max={250} step={5}
               display={usd(rate)} onChange={(v) => { setRate(v); setTouched(true); }} />
        {!touched && (
          <p className="text-sm text-ink-muted sm:col-span-2">
            Example: 10 hours a week at $50 an hour. Move the faders to match yours.
          </p>
        )}
      </div>

      {result ? (
        <div className="mt-8 flex flex-col gap-6" aria-live="polite">
          <Meter label="Editing costs you now" value={laborCost} max={laborCost} tone="cost" />
          <Meter label={`${result.bundle.name} costs`} value={result.bundle.monthly_price_usd} max={laborCost} tone="save" />

          <div>
            <p className="font-display text-4xl font-bold leading-tight tabular-nums">
              {result.net > 0 ? `${usd(result.net)} a month back` : "This stack won’t pay for itself yet"}
            </p>
            <p className="mt-2 max-w-[60ch] leading-relaxed text-ink-muted">
              {result.net > 0
                ? `About ${Math.round(result.hoursSaved)} hours saved a month, assuming a ${Math.round(result.bundle.est_time_saved_pct * 100)}% cut in editing time. Your results depend on your workflow.`
                : "At these hours, a free plan or a single tool is the better call. Raise your weekly hours to see where it breaks even."}
            </p>
          </div>

          <ul className="divide-y divide-line border-y border-line">
            {result.bundle.tools.map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-ink-muted">{t.role}</p>
                </div>
                <a
                  href={t.affiliate_url} target="_blank" rel="sponsored noopener" referrerPolicy="no-referrer-when-downgrade"
                  className="inline-flex min-h-11 shrink-0 items-center rounded-control border border-control-border px-4 text-sm hover:border-ink"
                >
                  See {t.name} plans
                </a>
              </li>
            ))}
          </ul>

          <p className="text-sm leading-relaxed text-ink-muted">
            We earn a commission if you buy through these links, at no extra cost to you. Prices change, so check the seller’s page before you buy.
          </p>

          {/* Desktop: inline. Mobile: pinned bar below. */}
          <button
            type="button" onClick={() => setModalOpen(true)}
            className="hidden min-h-11 self-start rounded-control bg-signal px-5 font-medium text-on-signal hover:bg-signal-hover sm:inline-flex sm:items-center"
          >
            Email me this build
          </button>

          <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-line bg-paper/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
            {firstTool && (
              <a
                href={firstTool.affiliate_url} target="_blank" rel="sponsored noopener" referrerPolicy="no-referrer-when-downgrade"
                className="flex min-h-11 flex-1 items-center justify-center rounded-control border border-control-border px-3 text-sm"
              >
                See {firstTool.name}
              </a>
            )}
            <button
              type="button" onClick={() => setModalOpen(true)}
              className="min-h-11 flex-1 rounded-control bg-signal px-3 font-medium text-on-signal"
            >
              Email me this build
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-8 text-ink-muted">No stacks are published yet. Add rows to saas_bundles to see a recommendation.</p>
      )}

      {modalOpen && result && (
        <SaveBuildModal
          onClose={() => setModalOpen(false)}
          sourceTool="roi_calculator"
          build={{ hours, rate, useCase, bundleSlug: result.bundle.slug, net: Math.round(result.net) }}
        />
      )}
    </section>
  );
}
