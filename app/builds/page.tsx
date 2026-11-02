import BuildCard from "@/components/BuildCard";
import { checkedLabel, getAllBuilds, usd, USE_CASE_LABELS } from "@/lib/builds";
import { pageMeta } from "@/lib/seo";
import { bundlePriceVisible } from "@/lib/retailers";

export const revalidate = 3600;
export const metadata = pageMeta({
  title: "Builds",
  description: "Turnkey recording setups and AI editing stacks, with the compatibility already checked.",
  path: "/builds",
});

export default async function Builds() {
  const { software, gear } = await getAllBuilds();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-10 sm:px-5 sm:pt-10">
      <h1 className="font-display text-5xl font-bold leading-[0.95] sm:text-6xl">Builds</h1>
      <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-ink-muted">
        Complete setups where every part works with the others. Not sure which fits? The tools pick one for your numbers.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-3xl font-bold">Recording gear</h2>
        {gear.length ? (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {gear.map((b) => (
              <li key={b.slug}>
                <BuildCard
                  href={`/builds/gear/${b.slug}`}
                  kind={b.people_count > 1 ? `${b.people_count} people` : "1 person"}
                  name={b.name}
                  blurb={b.description}
                  price={b.price_checked_at && bundlePriceVisible(b.components) ? usd(b.cash_price_usd) : null}
                  checked={checkedLabel(b.price_checked_at)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-ink-muted">Gear builds are on the way.</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl font-bold">Editing software</h2>
        {software.length ? (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {software.map((b) => (
              <li key={b.slug}>
                <BuildCard
                  href={`/builds/software/${b.slug}`}
                  kind={USE_CASE_LABELS[b.use_case] ?? "Software stack"}
                  name={b.name}
                  blurb={b.description}
                  price={b.price_checked_at ? `${usd(b.monthly_price_usd)}/mo` : null}
                  checked={checkedLabel(b.price_checked_at)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-ink-muted">Software stacks are on the way.</p>
        )}
      </section>

      <p className="mt-12 text-sm leading-relaxed text-ink-muted">
        We earn a commission if you buy through links on these pages, at no extra cost to you.
      </p>
    </div>
  );
}
