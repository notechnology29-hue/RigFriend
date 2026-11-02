import Link from "next/link";
import BuildCard from "@/components/BuildCard";
import RoiCalculator from "@/components/RoiCalculator";
import { getSaasBundles } from "@/lib/bundles";
import { checkedLabel, getAllBuilds, usd } from "@/lib/builds";
import { bundlePriceVisible } from "@/lib/retailers";

export const revalidate = 3600; // re-read bundles hourly

type Props = { searchParams: Promise<{ use?: string }> };

export default async function Home({ searchParams }: Props) {
  const [{ use }, bundles, builds] = await Promise.all([searchParams, getSaasBundles(), getAllBuilds()]);

  // A short mixed row: cheapest gear builds and software stacks, alternating.
  const row: { href: string; kind: string; name: string; blurb: string | null; price: string | null; checked: string | null }[] = [];
  for (let i = 0; i < 3; i++) {
    const g = builds.gear[i];
    const s = builds.software[i];
    if (g) row.push({ href: `/builds/gear/${g.slug}`, kind: "Gear", name: g.name, blurb: g.description,
      price: g.price_checked_at && bundlePriceVisible(g.components) ? usd(g.cash_price_usd) : null, checked: checkedLabel(g.price_checked_at) });
    if (s) row.push({ href: `/builds/software/${s.slug}`, kind: "Software", name: s.name, blurb: s.description,
      price: s.price_checked_at ? `${usd(s.monthly_price_usd)}/mo` : null, checked: checkedLabel(s.price_checked_at) });
  }

  return (
    <>
      <RoiCalculator bundles={bundles} initialUseCase={use} />

      <section className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-5">
        <Link href="/tools/gear" className="flex items-center justify-between gap-4 rounded-panel bg-panel p-6 hover:bg-line/60">
          <span>
            <span className="block font-display text-3xl font-bold leading-tight">Is your gear the bottleneck?</span>
            <span className="mt-1 block text-ink-muted">Check whether your interface can actually drive your mic.</span>
          </span>
          <span className="shrink-0 rounded-control bg-ink px-4 py-2 text-sm text-paper">Check my mic</span>
        </Link>
      </section>

      {row.length > 0 && (
        <section className="mx-auto w-full max-w-3xl pb-12" aria-labelledby="builds-heading">
          <div className="flex items-baseline justify-between px-4 sm:px-5">
            <h2 id="builds-heading" className="font-display text-3xl font-bold">Builds</h2>
            <Link href="/builds" className="text-sm underline underline-offset-4">See all</Link>
          </div>
          {/* Swipeable on phones, a grid on wider screens. */}
          <ul className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-5">
            {row.map((c) => (
              <li key={c.href} className="w-[78%] shrink-0 snap-start sm:w-auto">
                <BuildCard {...c} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
