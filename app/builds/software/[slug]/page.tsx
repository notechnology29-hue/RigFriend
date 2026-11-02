import Link from "next/link";
import { notFound } from "next/navigation";
import { checkedLabel, getSoftwareBuild, softwareNotes, usd, USE_CASE_LABELS } from "@/lib/builds";
import { pageMeta } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const b = await getSoftwareBuild(slug);
  if (!b) return { title: "Build not found" };
  return pageMeta({
    title: b.name,
    description: b.description ?? `${b.name}: the tools, what each one does, and whether it pays for itself.`,
    path: `/builds/software/${slug}`,
  });
}

export default async function SoftwareBuildPage({ params }: Props) {
  const b = await getSoftwareBuild((await params).slug);
  if (!b) notFound();
  const notes = softwareNotes(b.compatibility_tags);
  const checked = checkedLabel(b.price_checked_at);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 pt-6 pb-10 sm:px-5 sm:pt-10">
      <Link href="/builds" className="text-sm text-ink-muted underline underline-offset-4">All builds</Link>
      <p className="mt-6 text-sm text-ink-muted">{USE_CASE_LABELS[b.use_case] ?? "Software stack"}</p>
      <h1 className="mt-1 font-display text-5xl font-bold leading-[0.95] sm:text-6xl">{b.name}</h1>
      {b.description && <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-ink-muted">{b.description}</p>}

      <div className="mt-6">
        {checked ? (
          <>
            <p className="font-display text-4xl font-bold tabular-nums">{usd(b.monthly_price_usd)}/mo</p>
            <p className="text-sm text-ink-muted">{checked}. Plans change, so confirm on each tool’s page.</p>
          </>
        ) : (
          <p className="text-ink-muted">Current prices are on each tool’s page.</p>
        )}
      </div>

      <h2 className="mt-10 font-display text-3xl font-bold">What’s in it</h2>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {b.tools.map((t) => (
          <li key={t.name} className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="font-medium">{t.name}</p>
              <p className="text-sm text-ink-muted">{t.role}{checked ? `, ${usd(t.monthly_price_usd)}/mo` : ""}</p>
            </div>
            <a href={t.affiliate_url} target="_blank" rel="sponsored noopener" referrerPolicy="no-referrer-when-downgrade"
               className="inline-flex min-h-11 shrink-0 items-center rounded-control border border-control-border px-4 text-sm hover:border-ink">
              See {t.name} plans
            </a>
          </li>
        ))}
      </ul>

      {notes.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-3xl font-bold">Why these work together</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </>
      )}

      <div className="mt-10 rounded-panel bg-panel p-6">
        <p className="font-display text-3xl font-bold leading-tight">Will it pay for itself?</p>
        <p className="mt-2 text-ink-muted">Put in your editing hours and see whether this stack saves more than it costs.</p>
        <Link href={`/?use=${b.use_case}`} className="mt-4 inline-flex min-h-11 items-center rounded-control bg-signal px-5 font-medium text-on-signal hover:bg-signal-hover">
          Run my numbers
        </Link>
      </div>

      <p className="mt-10 text-sm leading-relaxed text-ink-muted">
        We earn a commission if you buy through these links, at no extra cost to you.
      </p>
    </article>
  );
}
