import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { approveReview, dismissReview, logout, saveLinks, setBundleActive } from "@/app/admin/actions";
import { RETAILER_OPTIONS, retailerOf } from "@/lib/retailers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

const ISSUE_LABELS: Record<string, string> = {
  price_change: "Price changed",
  out_of_stock: "Out of stock",
  dead_link: "Product page is gone",
  blocked: "Couldn’t check",
  no_price: "No price found",
  bad_affiliate_link: "Affiliate link problem",
  missing_product_url: "Needs a product page",
  confirm_price: "Confirm price",
};

type Review = { id: string; product_slug: string; issue_type: string; old_value: string | null; new_value: string | null; details: string | null; created_at: string };
type Product = { slug: string; name: string; niche: string; affiliate_url: string | null; product_url: string | null; approved_price_usd: number | null; price_confirmed_at: string | null; retailer: string | null };
type Bundle = { slug: string; name: string; is_active: boolean; review_note?: string | null; table: "hardware" | "saas"; price: number; perMonth: boolean };

const btn = "inline-flex min-h-11 items-center justify-center rounded-control px-4 text-sm font-medium";
const tabs = [
  { id: "review", label: "Review" },
  { id: "bundles", label: "Bundles" },
  { id: "links", label: "Links" },
];

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string; msg?: string; q?: string }> }) {
  await requireAdmin();
  const { tab = "review", msg, q = "" } = await searchParams;
  const db = supabaseAdmin();

  const [reviews, products, sw, hw] = await Promise.all([
    db.from("review_queue").select("id, product_slug, issue_type, old_value, new_value, details, created_at").eq("status", "open").order("created_at"),
    db.from("tracked_products").select("slug, name, niche, affiliate_url, product_url, approved_price_usd, price_confirmed_at, retailer").order("name"),
    db.from("saas_bundles").select("slug, name, is_active, review_note, monthly_price_usd").order("name"),
    db.from("hardware_bundles").select("slug, name, is_active, review_note, cash_price_usd").order("name"),
  ]);

  const openReviews = (reviews.data ?? []) as Review[];
  const allProducts = (products.data ?? []) as Product[];
  const productName = new Map(allProducts.map((p) => [p.slug, p.name]));
  const bundles: Bundle[] = [
    ...(hw.data ?? []).map((b) => ({ ...b, table: "hardware" as const, price: Number(b.cash_price_usd), perMonth: false })),
    ...(sw.data ?? []).map((b) => ({ ...b, table: "saas" as const, price: Number(b.monthly_price_usd), perMonth: true })),
  ];
  const needsLinks = (p: Product) => !p.affiliate_url || /example\.com/i.test(p.affiliate_url) || !p.product_url || !p.retailer;
  const query = q.toLowerCase();
  const shownProducts = allProducts
    .filter((p) => !query || p.name.toLowerCase().includes(query) || p.slug.includes(query))
    .sort((a, b) => Number(needsLinks(b)) - Number(needsLinks(a)));

  const counts: Record<string, number> = {
    review: openReviews.length,
    bundles: bundles.filter((b) => !b.is_active).length,
    links: allProducts.filter(needsLinks).length,
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-16 sm:px-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl font-bold">Admin</h1>
        <form action={logout}><button className={`${btn} text-ink-muted`}>Sign out</button></form>
      </div>

      <nav className="mt-4 grid grid-cols-3 gap-2" aria-label="Admin sections">
        {tabs.map((t) => (
          <Link key={t.id} href={`/admin?tab=${t.id}`} aria-current={tab === t.id ? "page" : undefined}
                className={`${btn} border ${tab === t.id ? "border-ink bg-ink text-paper" : "border-control-border"}`}>
            {t.label}{counts[t.id] ? ` (${counts[t.id]})` : ""}
          </Link>
        ))}
      </nav>

      {msg && <p role="status" className="mt-4 rounded-control bg-panel p-3 text-sm">{msg}</p>}

      {tab === "review" && (
        <section className="mt-6">
          {openReviews.length === 0 ? (
            <p className="text-ink-muted">Nothing to review. The price checker will add items here after its next run.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {openReviews.map((r) => (
                <li key={r.id} className="rounded-panel bg-panel p-4">
                  <p className="text-sm text-ink-muted">{ISSUE_LABELS[r.issue_type] ?? r.issue_type}</p>
                  <p className="font-medium">{productName.get(r.product_slug) ?? r.product_slug}</p>
                  {r.issue_type === "price_change" && (
                    <p className="mt-1 font-display text-2xl font-semibold tabular-nums">${r.old_value} → ${r.new_value}</p>
                  )}
                  {r.details && <p className="mt-1 text-sm text-ink-muted">{r.details}</p>}
                  <div className="mt-3 flex gap-2">
                    <form action={approveReview}><input type="hidden" name="id" value={r.id} />
                      <button className={`${btn} bg-signal text-on-signal`}>
                        {r.issue_type === "out_of_stock" || r.issue_type === "dead_link" ? "Approve (pauses its bundles)" : "Approve"}
                      </button>
                    </form>
                    <form action={dismissReview}><input type="hidden" name="id" value={r.id} />
                      <button className={`${btn} border border-control-border`}>Dismiss</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "bundles" && (
        <section className="mt-6">
          <ul className="flex flex-col gap-3">
            {bundles.sort((a, b) => Number(a.is_active) - Number(b.is_active)).map((b) => (
              <li key={`${b.table}-${b.slug}`} className="rounded-panel bg-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-muted">{b.table === "hardware" ? "Gear" : "Software"} · {b.is_active ? "Live" : "Off"}</p>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-sm tabular-nums text-ink-muted">${b.price}{b.perMonth ? "/mo" : ""} (planning price until checked)</p>
                  </div>
                  <form action={setBundleActive}>
                    <input type="hidden" name="table" value={b.table} />
                    <input type="hidden" name="slug" value={b.slug} />
                    <input type="hidden" name="active" value={String(!b.is_active)} />
                    <button className={`${btn} ${b.is_active ? "border border-control-border" : "bg-signal text-on-signal"}`}>
                      {b.is_active ? "Switch off" : "Go live"}
                    </button>
                  </form>
                </div>
                {b.review_note && <p className="mt-2 text-sm text-ink-muted">{b.review_note}</p>}
                {b.table === "hardware" && (
                  <Link href={`/builds/gear/${b.slug}`} className="mt-2 inline-block text-sm underline underline-offset-4">View page</Link>
                )}
                {b.table === "saas" && (
                  <Link href={`/builds/software/${b.slug}`} className="mt-2 inline-block text-sm underline underline-offset-4">View page</Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "links" && (
        <section className="mt-6">
          <form className="flex gap-2" action="/admin">
            <input type="hidden" name="tab" value="links" />
            <input name="q" defaultValue={q} placeholder="Search products" aria-label="Search products"
                   className="min-h-11 flex-1 rounded-control border border-control-border bg-paper px-3 text-base" />
            <button className={`${btn} border border-control-border`}>Search</button>
          </form>
          <p className="mt-3 text-sm text-ink-muted">Products missing a real link or product page are listed first. Saving updates every bundle that uses the product.</p>
          <ul className="mt-4 flex flex-col gap-3">
            {shownProducts.map((p) => (
              <li key={p.slug} className="rounded-panel bg-panel p-4">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-ink-muted">
                  {p.niche === "saas" ? "Software" : "Gear"}
                  {p.retailer ? ` · ${retailerOf(p.retailer)?.name}` : " · no store set"}
                  {needsLinks(p) ? " · needs links" : " · links set"}
                </p>
                <form action={saveLinks} className="mt-3 flex flex-col gap-2">
                  <input type="hidden" name="slug" value={p.slug} />
                  <label className="text-sm text-ink-muted" htmlFor={`store-${p.slug}`}>Store</label>
                  <select id={`store-${p.slug}`} name="retailer" defaultValue={p.retailer ?? ""}
                          className="min-h-11 rounded-control border border-control-border bg-paper px-3 text-base">
                    <option value="">Choose the store this link goes to</option>
                    {RETAILER_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <label className="text-sm text-ink-muted" htmlFor={`aff-${p.slug}`}>Affiliate link</label>
                  <input id={`aff-${p.slug}`} name="affiliate_url" type="url" inputMode="url" defaultValue={p.affiliate_url ?? ""}
                         className="min-h-11 rounded-control border border-control-border bg-paper px-3 text-base" />
                  <label className="text-sm text-ink-muted" htmlFor={`url-${p.slug}`}>Product page (what the price checker reads)</label>
                  <input id={`url-${p.slug}`} name="product_url" type="url" inputMode="url" defaultValue={p.product_url ?? ""}
                         className="min-h-11 rounded-control border border-control-border bg-paper px-3 text-base" />
                  <button className={`${btn} mt-1 self-start bg-ink text-paper`}>Save</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
