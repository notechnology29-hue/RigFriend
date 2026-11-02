import { loadContext, type Lead } from "@/lib/email/context";
import { renderEmail } from "@/lib/email/templates";

export const LAST_STEP = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Sends email `step` (1–5) of the sequence to one lead through Resend. */
export async function sendStep(lead: Lead, step: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM; // e.g. "Rigfriend <hello@rigfriend.com>", on a domain verified in Resend
  if (!key || !from) return { ok: false, error: "RESEND_API_KEY or EMAIL_FROM is not set" };

  const ctx = await loadContext(lead);
  const email = renderEmail(step, ctx);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [lead.email],
      reply_to: process.env.EMAIL_REPLY_TO || undefined,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: {
        // One-click unsubscribe, which Gmail and Yahoo expect from bulk senders.
        "List-Unsubscribe": `<${ctx.unsubscribeOneClickUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
  return { ok: true };
}

/** When the next email is due after `step` was sent, or null when the series is over or not consented. */
export function nextSendAt(step: number, continueSequence: boolean): string | null {
  if (!continueSequence || step >= LAST_STEP) return null;
  return new Date(Date.now() + DAY_MS).toISOString();
}
