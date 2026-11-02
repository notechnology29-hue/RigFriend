import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Privacy",
  description: "What Rigfriend collects, why, and how to unsubscribe or delete your data.",
  path: "/privacy",
});

const UPDATED = "October 28, 2026";
const CONTACT = "privacy@rigfriend.com";

export default function Privacy() {
  return (
    <article className="mx-auto w-full max-w-[65ch] px-4 py-10 sm:px-5">
      <h1 className="font-display text-5xl font-bold leading-[0.95]">Privacy</h1>
      <p className="mt-3 text-sm text-ink-muted">Last updated {UPDATED}</p>

      <div className="mt-6 space-y-8 text-lg leading-relaxed [&_h2]:font-display [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:leading-tight [&_p]:mt-3">
        <section>
          <h2>The short version</h2>
          <p>
            You can use every tool on Rigfriend without giving us anything. If you ask us to email you a build,
            we keep your email address and the settings you entered so we can send it. We don’t sell or rent your
            email to anyone.
          </p>
        </section>

        <section>
          <h2>What we collect</h2>
          <p>
            <strong>When you ask us to email a build:</strong> your email address, the numbers and gear you entered
            into the tool, the result it showed you, and whether you said yes to follow-up emails.
          </p>
          <p>
            <strong>When you visit:</strong> our hosting provider keeps standard server logs, like your IP address and
            browser type, to keep the site running and secure.
          </p>
          <p>
            We don’t currently use analytics or advertising cookies. If that changes, we’ll update this page first.
          </p>
        </section>

        <section>
          <h2>Affiliate links</h2>
          <p>
            Some links go to retailers and software companies that pay us a commission. When you click one, that
            company or its affiliate network may set its own cookies to record that we referred you. Their privacy
            policies cover what they collect. See <a className="underline underline-offset-4" href="/how-we-make-money">how we make money</a>.
          </p>
        </section>

        <section>
          <h2>How we use your email</h2>
          <p>
            We send the build you asked for. If you checked the box for follow-ups, we send up to four more emails
            over the next few days with setup tips and related tools. That’s the whole series.
          </p>
        </section>

        <section>
          <h2>Who handles your data</h2>
          <p>
            Supabase stores the database, Resend sends our emails, and our hosting provider serves the site. Each
            handles data on our behalf under its own security and privacy terms.
          </p>
        </section>

        <section>
          <h2>Your choices</h2>
          <p>
            Every email has an unsubscribe link that works in one click. To see, correct or delete the data we hold
            about you, email <a className="underline underline-offset-4" href={`mailto:${CONTACT}`}>{CONTACT}</a> and
            we’ll respond within 30 days. If you unsubscribe, we keep your address only to make sure we never email it again.
          </p>
        </section>

        <section>
          <h2>Children</h2>
          <p>Rigfriend isn’t meant for children under 13, and we don’t knowingly collect their information.</p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>If we change how we handle your data, we’ll update this page and the date at the top.</p>
        </section>
      </div>
    </article>
  );
}
