import Link from "next/link";
import { affiliationNotices } from "@/lib/retailers";

export default function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-3xl border-t border-line px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] text-sm text-ink-muted sm:px-5 sm:pb-10">
      <nav className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/about" className="underline underline-offset-4 hover:text-ink">About</Link>
        <Link href="/how-we-make-money" className="underline underline-offset-4 hover:text-ink">How we make money</Link>
        <Link href="/privacy" className="underline underline-offset-4 hover:text-ink">Privacy</Link>
      </nav>
      {affiliationNotices().map((n) => (
        // zZounds requires this line (and their logo, which they provide on approval).
        <p key={n} className="mt-4">{n}</p>
      ))}
      <p className="mt-4">© {new Date().getFullYear()} Rigfriend</p>
    </footer>
  );
}
