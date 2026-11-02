import Link from "next/link";

// price is null until the weekly checker has confirmed every part's price.
export default function BuildCard({
  href, kind, name, blurb, price, checked,
}: { href: string; kind: string; name: string; blurb: string | null; price: string | null; checked: string | null }) {
  return (
    <Link href={href} className="flex h-full flex-col rounded-panel bg-panel p-5 hover:bg-line/60">
      <span className="text-sm text-ink-muted">{kind}</span>
      <span className="mt-1 font-display text-2xl font-bold leading-tight">{name}</span>
      {blurb && <span className="mt-2 line-clamp-3 text-ink-muted">{blurb}</span>}
      <span className="mt-auto pt-4">
        {price ? (
          <>
            <span className="block font-display text-2xl font-semibold tabular-nums">{price}</span>
            {checked && <span className="text-sm text-ink-muted">{checked}</span>}
          </>
        ) : (
          <span className="text-sm text-ink-muted">Current prices on each seller’s page</span>
        )}
      </span>
    </Link>
  );
}
