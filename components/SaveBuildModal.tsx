"use client";

import { useEffect, useState } from "react";

export type SourceTool = "roi_calculator" | "bottleneck_checker";

export default function SaveBuildModal({
  onClose, sourceTool, build,
}: { onClose: () => void; sourceTool: SourceTool; build: Record<string, unknown> }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error" | "limited">("idle");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  async function save() {
    setState("saving");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source_tool: sourceTool, build, marketing_consent: consent }),
      });
      setState(res.ok ? "saved" : res.status === 429 ? "limited" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="save-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-t-panel bg-paper p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-panel sm:pb-6">
        {state === "saved" ? (
          <>
            <h2 id="save-title" className="font-display text-3xl font-bold">Build emailed</h2>
            <p className="mt-2 text-ink-muted">Check your inbox. If it’s not there in a few minutes, look in spam or promotions.</p>
            <button onClick={onClose} className="mt-6 min-h-11 rounded-control bg-ink px-5 text-paper">Close</button>
          </>
        ) : (
          <>
            <h2 id="save-title" className="font-display text-3xl font-bold">Email me this build</h2>
            <label htmlFor="lead-email" className="mt-4 block text-sm text-ink-muted">Email</label>
            <input
              id="lead-email" type="email" inputMode="email" autoComplete="email" autoFocus
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-control border border-control-border bg-paper px-3 text-base"
            />
            <label className="mt-4 flex items-start gap-3 text-sm text-ink-muted">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-ink" />
              Also send me up to four follow-up emails with setup tips. Unsubscribe anytime.
            </label>
            <p className="mt-3 text-sm text-ink-muted">
              We never sell your email. <a href="/privacy" className="underline underline-offset-4">Privacy</a>
            </p>
            {state === "error" && <p className="mt-3 text-sm text-overload">That email didn’t send. Check the address and try again.</p>}
            {state === "limited" && <p className="mt-3 text-sm text-overload">We’ve already sent a few builds to that address today. Try again tomorrow.</p>}
            <div className="mt-6 flex gap-3">
              <button
                onClick={save} disabled={!email || state === "saving"}
                className="min-h-11 flex-1 rounded-control bg-signal px-5 font-medium text-on-signal hover:bg-signal-hover disabled:opacity-50 sm:flex-none"
              >
                {state === "saving" ? "Sending…" : "Email me this build"}
              </button>
              <button onClick={onClose} className="min-h-11 rounded-control px-4 text-ink-muted">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
