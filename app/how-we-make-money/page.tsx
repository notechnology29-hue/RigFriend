import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "How we make money",
  description: "How Rigfriend earns from affiliate links, and why commissions never change what the tools recommend.",
  path: "/how-we-make-money",
});

export default function HowWeMakeMoney() {
  return (
    <article className="mx-auto w-full max-w-[65ch] px-4 py-10 sm:px-5">
      <h1 className="font-display text-5xl font-bold leading-[0.95]">How we make money</h1>
      <div className="mt-6 space-y-4 text-lg leading-relaxed">
        <p>
          Some links on Rigfriend are affiliate links. If you buy through one, we may earn a commission
          from the seller. You pay the same price either way.
        </p>
        <p>
          Commissions never decide what our tools recommend. The calculator picks the stack that saves you
          the most for your numbers, and it will tell you when a stack won’t pay for itself. The gear checker
          follows the same compatibility rules no matter which retailer pays more.
        </p>
        <p>
          Prices change. Each build shows the date we last checked its prices, so confirm the current price
          on the seller’s page before you buy.
        </p>
      </div>
    </article>
  );
}
