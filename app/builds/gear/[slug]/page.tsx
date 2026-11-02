import Link from "next/link";
import { notFound } from "next/navigation";
import { checkedLabel, gearNotes, getGearBuild, usd } from "@/lib/builds";
import { pageMeta } from "@/lib/seo";
import { bundlePriceVisible, buyLabel, canShowPrice, zzoundsPaymentPlanLine } from "@/lib/retailers";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const b = await getGearBuild(slug);
  if (!b) return { title: "Build not found" };
  return pageMeta({
    title: b.name,
    description: b.description ?? `${b.name}: every part, and why they work together.`,
    path: `/builds/gear/${slug}`,
  });
}

export default async function GearBuildPage({ params }: Props) {
  const b = await getGearBuild((await params).slug);
  if (!b) notFound();
  const checked = bundlePriceVisible(b.components) ? checkedLabel(b.price_checked_at) : null;
  const planLine = zzoundsPaymentPlanLine(b.installment_retailer);
  const notes = gearNotes(b.signal_chain_rules);
  const hasGainMath = b.min_preamp_gain_db != null && b.interface_max_gain_db != null;
  const available = (b.interface_max_gain_db ?? 0) + (b.inline_preamp_gain_db ?? 0);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 pt-6 pb-10 sm:px-5 sm:pt-10">
      <Link href="/builds" className="text-sm text-ink-muted underline underline-offset-4">All builds</Link>
      <p className="mt-6 text-sm text-ink-muted">{b.people_count > 1 ? `For ${b.people_count} people` : "For 1 person"}</p>
      <h1 className="mt-1 font-display text-5xl font-bold leading-[0.95] sm:text-6xl">{b.name}</h1>
      {b.description && <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-ink-muted">{b.description}</p>}

      <div className="mt-6">
        {checked ? (
          <>
            <p className="font-display text-4xl font-bold tabular-nums">{usd(b.cash_price_usd)}</p>
            <p className="mt-1 text-sm text-ink-muted">{checked}. Confirm on the seller’s page before you buy.</p>
          </>
        ) : (
          <p className="text-ink-muted">Current prices are on each store’s page.</p>
        )}
        {planLine && <p className="mt-1 text-sm text-ink-muted">{planLine}</p>}
      </div>

      <h2 className="mt-10 font-display text-3xl font-bold">Every part</h2>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {b.components.map((c) => (
          <li key={c.name} className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-ink-muted">{c.role}{b.price_checked_at && canShowPrice(c.retailer) ? `, ${usd(c.price_usd)}` : ""}</p>
            </div>
            <a href={c.affiliate_url} target="_blank" rel="sponsored noopener" referrerPolicy="no-referrer-when-downgrade"
               className="inline-flex min-h-11 shrink-0 items-center rounded-control border border-control-border px-4 text-sm hover:border-ink">
              {buyLabel(c.retailer)}
            </a>
          </li>
        ))}
      </ul>

      {(hasGainMath || notes.length > 0) && (
        <>
          <h2 className="mt-10 font-display text-3xl font-bold">Why it works</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
            {hasGainMath && (
              <li>
                The mic needs about {b.min_preamp_gain_db} dB of gain, and this setup gives {available} dB
                {b.inline_preamp_gain_db ? ` (${b.interface_max_gain_db} from the interface plus ${b.inline_preamp_gain_db} from the booster)` : ""}.
                That’s {available - (b.min_preamp_gain_db ?? 0)} dB of headroom, so the gain knob stays in its clean range.
              </li>
            )}
            {b.requires_phantom_power && <li>The mic needs phantom power, and the interface supplies it.</li>}
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </>
      )}

      <div className="mt-10 rounded-panel bg-panel p-6">
        <p className="font-display text-3xl font-bold leading-tight">Already own some of this?</p>
        <p className="mt-2 text-ink-muted">Check your current mic and interface first. You might only need one part.</p>
        <Link href="/tools/gear" className="mt-4 inline-flex min-h-11 items-center rounded-control bg-signal px-5 font-medium text-on-signal hover:bg-signal-hover">
          Check my gear
        </Link>
      </div>

      <p className="mt-10 text-sm leading-relaxed text-ink-muted">
        We earn a commission if you buy through these links, at no extra cost to you.
      </p>
    </article>
  );
}
