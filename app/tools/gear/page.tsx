import GearChecker from "@/components/GearChecker";
import { getGearData } from "@/lib/bundles";
import { pageMeta } from "@/lib/seo";

export const revalidate = 3600;
export const metadata = pageMeta({
  title: "Will this mic work with that interface?",
  description: "Free check for gain, phantom power and inputs. See if your gear is the bottleneck, and the cheapest fix.",
  path: "/tools/gear",
});

export default async function GearPage() {
  const { catalog, bundles, rescue } = await getGearData();
  return <GearChecker catalog={catalog} bundles={bundles} rescue={rescue} />;
}
