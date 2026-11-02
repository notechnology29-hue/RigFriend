import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 sm:px-5">
      <Link href="/" className="flex items-center gap-2 rounded-control" aria-label="Rigfriend home">
        {/* Same artwork as the favicon in app/icon.svg. */}
        <img src="/rigfriend-mark.svg" alt="" width={28} height={28} className="rounded-[7px]" />
        <span className="font-display text-2xl font-bold leading-none">rigfriend</span>
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <Link href="/tools/gear" className="inline-flex min-h-11 items-center rounded-control px-3 hover:bg-panel">Gear check</Link>
        <Link href="/builds" className="inline-flex min-h-11 items-center rounded-control px-3 hover:bg-panel">Builds</Link>
      </nav>
    </header>
  );
}
