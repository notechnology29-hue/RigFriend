export const metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function Unsubscribe({
  searchParams,
}: { searchParams: Promise<{ token?: string; done?: string }> }) {
  const { token, done } = await searchParams;

  return (
    <article className="mx-auto w-full max-w-[65ch] px-4 py-10 sm:px-5">
      <h1 className="font-display text-5xl font-bold leading-[0.95]">
        {done ? "You’re unsubscribed" : "Unsubscribe"}
      </h1>
      {done ? (
        <p className="mt-4 text-lg leading-relaxed">You won’t get any more emails from Rigfriend. The tools still work without an account.</p>
      ) : token ? (
        <>
          <p className="mt-4 text-lg leading-relaxed">Stop all Rigfriend emails to this address?</p>
          <form method="post" action={`/api/unsubscribe?token=${encodeURIComponent(token)}`} className="mt-6">
            <button type="submit" className="min-h-11 rounded-control bg-ink px-5 text-paper">Unsubscribe me</button>
          </form>
        </>
      ) : (
        <p className="mt-4 text-lg leading-relaxed">
          This link is missing its code. Use the unsubscribe link at the bottom of any Rigfriend email.
        </p>
      )}
    </article>
  );
}
