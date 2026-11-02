import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from "@/lib/og";
import { getSoftwareBuild, usd, USE_CASE_LABELS } from "@/lib/builds";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "A Rigfriend software stack";
export const revalidate = 3600;

type Params = { slug: string };

export default async function Image({ params }: { params: Promise<Params> | Params }) {
  const { slug } = await params;
  const b = await getSoftwareBuild(slug);
  if (!b) return renderOg({ title: "AI stacks that save you editing time" });

  return renderOg({
    kicker: `${USE_CASE_LABELS[b.use_case] ?? "Software"} stack`,
    title: b.name,
    detail: b.price_checked_at
      ? `${usd(b.monthly_price_usd)}/mo. See if it pays for itself.`
      : "See if it pays for itself.",
    level: Math.min(1, 0.4 + b.est_time_saved_pct),
  });
}
