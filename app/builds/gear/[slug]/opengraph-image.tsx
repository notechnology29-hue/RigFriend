import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from "@/lib/og";
import { getGearBuild, usd } from "@/lib/builds";
import { bundlePriceVisible } from "@/lib/retailers";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "A Rigfriend gear build";
export const revalidate = 3600;

type Params = { slug: string };

export default async function Image({ params }: { params: Promise<Params> | Params }) {
  const { slug } = await params;
  const b = await getGearBuild(slug);
  if (!b) return renderOg({ title: "Gear builds that work together" });

  const headroom =
    b.min_preamp_gain_db != null && b.interface_max_gain_db != null
      ? (b.interface_max_gain_db + (b.inline_preamp_gain_db ?? 0)) - b.min_preamp_gain_db
      : null;
  return renderOg({
    kicker: b.people_count > 1 ? `Gear build for ${b.people_count} people` : "Gear build",
    title: b.name,
    detail: b.price_checked_at && bundlePriceVisible(b.components)
      ? `${usd(b.cash_price_usd)}, every part checked to work together`
      : "Every part checked to work together",
    level: headroom != null ? Math.min(1, 0.5 + headroom / 60) : 0.75,
  });
}
