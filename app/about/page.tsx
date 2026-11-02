import Link from "next/link";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "About Rigfriend",
  description: "Who makes Rigfriend, how the tools work, and how we stay honest while earning commissions.",
  path: "/about",
});

// EDIT ME: keep every sentence true. Change the second paragraph to match your own experience.
export default function About() {
  return (
    <article className="mx-auto w-full max-w-[65ch] px-4 py-10 sm:px-5">
      <h1 className="font-display text-5xl font-bold leading-[0.95]">About Rigfriend</h1>
      <div className="mt-6 space-y-4 text-lg leading-relaxed">
        <p>
          Rigfriend is the friend who knows what’s holding your rig back. It’s a set of free tools for podcasters,
          video creators and musicians who already record, and want to know what to fix or upgrade next.
        </p>
        <p>
          It’s made by a working podcast producer and musician who records shows and music, builds the setups,
          and got tired of advice that boils down to “buy the expensive thing.”
        </p>
      </div>

      <h2 className="mt-10 font-display text-3xl font-bold">How the tools work</h2>
      <div className="mt-3 space-y-4 text-lg leading-relaxed">
        <p>
          The <Link href="/tools/gear" className="underline underline-offset-4">gear checker</Link> compares the gain
          your mic needs with what your interface can give, using makers’ spec sheets, and checks phantom power and
          inputs. It always shows the cheapest fix first.
        </p>
        <p>
          The <Link href="/" className="underline underline-offset-4">editing calculator</Link> weighs what your editing
          time costs against what an AI stack costs. When a stack won’t pay for itself, it says so.
        </p>
        <p>
          Prices are checked every week. Each build shows the date we last confirmed its prices, and hides prices we
          haven’t confirmed.
        </p>
      </div>

      <h2 className="mt-10 font-display text-3xl font-bold">How we stay honest</h2>
      <div className="mt-3 space-y-4 text-lg leading-relaxed">
        <p>
          We earn commissions from some links, and we say so on every page that has them. Commissions never change what
          the tools recommend. Read more about <Link href="/how-we-make-money" className="underline underline-offset-4">how we make money</Link>.
        </p>
        <p>
          Questions or a setup we got wrong? Email <a href="mailto:hello@rigfriend.com" className="underline underline-offset-4">hello@rigfriend.com</a>.
        </p>
      </div>
    </article>
  );
}
