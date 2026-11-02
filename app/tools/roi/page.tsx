import RoiCalculator from "@/components/RoiCalculator";
import { getSaasBundles } from "@/lib/bundles";
import { pageMeta } from "@/lib/seo";

export const revalidate = 3600;
// Same tool as the homepage, so search engines are pointed at "/".
export const metadata = pageMeta({
  title: "Editing cost calculator",
  description: "See what editing really costs you each month, next to the AI stack that cuts it most.",
  path: "/",
});

// Same tool as the homepage, on its own URL for links from videos and posts.
export default async function RoiPage() {
  return <RoiCalculator bundles={await getSaasBundles()} />;
}
