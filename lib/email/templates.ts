// The 5-email Rigfriend sequence. Each email is a list of blocks rendered to both
// HTML and plain text, so the two versions never drift apart.
import type { EmailCtx } from "@/lib/email/context";
import { bundlePriceVisible, canShowPrice } from "@/lib/retailers";

// Emails never link straight to a store. zZounds only credits clicks from your website,
// and some programs restrict affiliate links in email, so every link goes to a Rigfriend page.

type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "items"; items: { label: string; detail?: string; url?: string | null }[] }
  | { t: "btn"; label: string; url: string };

export type RenderedEmail = { subject: string; html: string; text: string };

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 });
const round = (n: number) => Math.round(n);
const pct = (n: number) => Math.round(n * 100);
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const GEAR_SUBJECT = {
  ok: "Your setup check: no bottleneck",
  tight: "Your setup check: it works, but it’s tight",
  problem: "Your setup check: found the bottleneck",
} as const;

function emailFor(step: number, ctx: EmailCtx): { subject: string; blocks: Block[] } {
  const site = ctx.siteUrl;
  const calcUrl = `${site}/`;
  const gearUrl = `${site}/tools/gear`;

  // ---------- Editing calculator leads ----------
  if (ctx.lead.source_tool === "roi_calculator") {
    const r = ctx.roi;
    const b = r?.bundle;
    const stackUrl = b ? `${site}/builds/software/${b.slug}` : calcUrl;
    const toolItems = (b?.tools ?? []).map((t) => ({
      label: `${t.name}: ${t.role}`, detail: `${usd(t.monthly_price_usd)}/mo`, url: stackUrl,
    }));

    if (step === 1) {
      if (!r || !b) {
        return { subject: "Your editing stack", blocks: [
          { t: "p", text: "The stack you looked at is being updated, so we can’t send its details right now. Run the calculator again for today’s best match." },
          { t: "btn", label: "Open the calculator", url: calcUrl },
        ] };
      }
      return { subject: `Your editing stack: ${b.name}`, blocks: [
        { t: "p", text: `Here’s the build you asked for. At ${r.hours} hours a week and ${usd(r.rate)} an hour, editing costs you about ${usd(round(r.monthlyCost))} a month in time.` },
        { t: "h", text: `${b.name}: ${usd(b.monthly_price_usd)}/mo` },
        { t: "items", items: toolItems },
        { t: "p", text: r.net > 0
          ? `If it cuts your editing by ${pct(b.est_time_saved_pct)}%, that’s about ${round(r.hoursSaved)} hours and ${usd(round(r.net))} back each month after the stack’s cost. That’s an estimate; your workflow decides the real number.`
          : "At your current hours, this stack won’t pay for itself yet. A free plan or a single tool is the better call for now." },
        ...(b.tools[0] ? [{ t: "p" as const, text: `Tip: start with ${b.tools[0].name}. It does the heavy lifting. Add the others only if you find yourself missing them.` }] : []),
        { t: "btn", label: "Open the calculator", url: calcUrl },
      ] };
    }
    if (step === 2) {
      return { subject: "Faster editing won’t fix muddy audio", blocks: [
        { t: "p", text: "Your editing stack speeds up the cut. It can’t fix audio that’s quiet or noisy at the source, and one of the most common causes in home setups is a low-output mic on an interface without enough gain." },
        { t: "p", text: "The gear check takes about 30 seconds. Pick your mic and what it plugs into, and it tells you whether there’s a bottleneck and the cheapest fix." },
        { t: "btn", label: "Check my mic", url: gearUrl },
      ] };
    }
    if (step === 3) {
      if (!r || !b) return { subject: "Your stack math", blocks: [{ t: "btn", label: "Run the numbers", url: calcUrl }] };
      return { subject: "Your stack math, for a whole year", blocks: [
        { t: "p", text: `Over 12 months, ${b.name} costs ${usd(b.monthly_price_usd * 12)}, against roughly ${round(r.hoursSaved * 12)} hours of editing back.` },
        { t: "p", text: r.net > 0
          ? `At your rate, that’s about ${usd(round(r.net * 12))} of your time a year after paying for the tools.`
          : "At today’s hours, the time saved doesn’t cover the cost yet. If you start publishing more, rerun the numbers." },
        { t: "p", text: "Two ways to keep it honest: start on monthly plans rather than annual ones, and cancel any tool you haven’t opened in two weeks. Switch to annual billing only once you know you’ll keep it." },
        { t: "items", items: toolItems },
      ] };
    }
    if (step === 4) {
      const p = b?.est_time_saved_pct ?? 0.35;
      const saved = 26 * p;
      return { subject: "A worked example: one weekly show", blocks: [
        { t: "p", text: "Here’s an example to make the numbers concrete. It’s an illustration, not a customer story." },
        { t: "p", text: `Say a weekly one-hour show takes 6 hours to edit by hand. That’s about 26 hours a month. If ${b ? b.name : "an AI stack"} cuts that by ${pct(p)}%, you get back about ${round(saved)} hours a month, roughly ${(saved / 6).toFixed(1)} episodes’ worth of editing.` },
        { t: "p", text: "The real gains depend on how much of your edit is mechanical (silences, filler words, retakes) and how much is creative judgment. Tools only help with the first part." },
        { t: "btn", label: "Run your own numbers", url: calcUrl },
      ] };
    }
    return { subject: "Last one from this series", blocks: [
      { t: "p", text: "This is the last email in this series, so you won’t hear from us again unless you run another check." },
      { t: "p", text: "Software prices and plans change often. If you’re still deciding, rerun the calculator before you sign up. It uses the prices we checked most recently." },
      { t: "p", text: "If something didn’t add up, or you have a question about your setup, just reply to this email." },
      { t: "btn", label: "Open the calculator", url: calcUrl },
    ] };
  }

  // ---------- Gear checker leads ----------
  const g = ctx.gear;
  if (!g) {
    return { subject: "Your setup check", blocks: [
      { t: "p", text: "Some of the gear you picked has changed in our catalog, so run the check again for an up-to-date answer." },
      { t: "btn", label: "Run the check", url: gearUrl },
    ] };
  }
  const res = g.result;
  const fixItems = g.fixes.map((f) => ({
    label: f.type === "remove_booster" ? "Take out the inline booster" : f.type === "booster" ? `Add a ${f.item.name}` : `Switch to the ${f.item.name}`,
    detail: [
      f.type !== "remove_booster" && f.item.price_usd != null && f.item.price_checked_at && canShowPrice(f.item.retailer) ? usd(Number(f.item.price_usd)) : null,
      f.result.headroom != null ? `leaves ${f.result.headroom} dB of headroom` : null,
    ].filter(Boolean).join(", ") || undefined,
    url: f.type === "remove_booster" ? null : gearUrl,
  }));
  const chain = `${g.mic.name}${g.iface ? ` into the ${g.iface.name}` : ""}${g.booster ? " with an inline booster" : ""}${g.people > 1 ? ` for ${g.people} people` : ""}`;

  if (step === 1) {
    return { subject: GEAR_SUBJECT[res.status], blocks: [
      { t: "p", text: `You checked ${chain}.` },
      ...(res.needed != null && res.available != null
        ? [{ t: "p" as const, text: `Your mic needs about ${res.needed} dB of gain, and your setup gives ${res.available} dB.` }]
        : []),
      ...res.issues.map((i) => ({ t: "p" as const, text: `Problem: ${i.message}` })),
      ...res.notes.map((n) => ({ t: "p" as const, text: n })),
      ...(fixItems.length ? [{ t: "h" as const, text: "Cheapest fix first" }, { t: "items" as const, items: fixItems }] : []),
      { t: "btn", label: "Run the check again", url: gearUrl },
    ] };
  }
  if (step === 2) {
    return { subject: "Better audio won’t shorten your edit", blocks: [
      { t: "p", text: "Once your audio is clean at the source, the next thing holding most creators back is time: hours of cutting silences, filler words and retakes." },
      { t: "p", text: "The editing calculator shows what that time costs you each month, next to the AI tools that cut it most. It also tells you when a tool won’t pay for itself." },
      { t: "btn", label: "See what editing costs me", url: calcUrl },
    ] };
  }
  if (step === 3) {
    if (res.status === "ok") {
      return { subject: "Good news: nothing to buy", blocks: [
        { t: "p", text: "Your chain has enough clean gain, so most gear upgrades would change less than the ads suggest." },
        { t: "p", text: "If you want a better sound anyway, the room usually matters more than the mic. Soft surfaces (a rug, curtains, a blanket behind you) and staying a few inches from the mic beat a new purchase for most home setups." },
      ] };
    }
    const fb = g.freshBuild;
    return { subject: "What fixing it actually costs", blocks: [
      ...(fixItems.length
        ? [{ t: "p" as const, text: "Here are your fixes again, cheapest first:" }, { t: "items" as const, items: fixItems }]
        : []),
      ...(fb
        ? [{ t: "p" as const, text: fb.price_checked_at && bundlePriceVisible(fb.components)
            ? `If you’d rather start fresh, the ${fb.name} is ${usd(Number(fb.cash_price_usd))} with every part checked to work together.`
            : `If you’d rather start fresh, the ${fb.name} has every part checked to work together.` },
           { t: "btn" as const, label: "See the full build", url: `${site}/builds/gear/${fb.slug}` }]
        : []),
      { t: "p", text: "Gear prices move often, so confirm the current price on the store’s page before you buy." },
    ] };
  }
  if (step === 4) {
    return { subject: "A worked example: the quiet-mic trap", blocks: [
      { t: "p", text: "Here’s a common setup, as an example rather than a customer story." },
      { t: "p", text: "A Shure SM7B goes into an older interface with about 56 dB of gain. For normal speech the SM7B needs roughly 60 dB, so the knob ends up maxed and the recording is still quiet. Boosting it later in software raises the hiss along with the voice." },
      { t: "p", text: "The fixes, cheapest first: an inline booster adds about 25 dB if the interface has phantom power, or a newer interface with more gain replaces the weak link." },
      { t: "p", text: res.status === "ok" ? "Your check came back clear, so this is the trap you’ve already avoided." : "If that sounds like your setup, your fix list from the first email still applies." },
      { t: "btn", label: "Run the check again", url: gearUrl },
    ] };
  }
  return { subject: "Last one from this series", blocks: [
    { t: "p", text: "This is the last email in this series, so you won’t hear from us again unless you run another check." },
    { t: "p", text: "If you’re still deciding on gear, rerun the check before you buy. It uses our latest specs and the prices we checked most recently." },
    { t: "p", text: "If something didn’t work, or you have a question about your setup, just reply to this email." },
    { t: "btn", label: "Run the check again", url: gearUrl },
  ] };
}

function toHtml(blocks: Block[], ctx: EmailCtx): string {
  const body = blocks.map((b) => {
    switch (b.t) {
      case "p": return `<p style="margin:0 0 16px">${esc(b.text)}</p>`;
      case "h": return `<p style="margin:24px 0 8px;font-size:20px;font-weight:700">${esc(b.text)}</p>`;
      case "btn": return `<p style="margin:24px 0"><a href="${esc(b.url)}" style="display:inline-block;background:#e3a23b;color:#1b2838;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:6px">${esc(b.label)}</a></p>`;
      case "items": return `<ul style="margin:0 0 16px;padding-left:20px">${b.items.map((i) =>
        `<li style="margin:0 0 8px">${i.url ? `<a href="${esc(i.url)}" style="color:#1b2838">${esc(i.label)}</a>` : esc(i.label)}${i.detail ? ` <span style="color:#4a5a6d">(${esc(i.detail)})</span>` : ""}</li>`).join("")}</ul>`;
    }
  }).join("\n");

  return `<!doctype html><html><body style="margin:0;background:#f5f7f9">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1b2838">
<p style="margin:0 0 24px;font-size:22px;font-weight:700">rigfriend</p>
${body}
<hr style="border:0;border-top:1px solid #c9d1d9;margin:32px 0 16px">
<p style="margin:0 0 8px;font-size:13px;color:#4a5a6d">You’re getting this because you asked Rigfriend to email you a build. Rigfriend earns a commission if you buy through links on our site, at no extra cost to you.</p>
${ctx.mailingAddress ? `<p style="margin:0 0 8px;font-size:13px;color:#4a5a6d">${esc(ctx.mailingAddress)}</p>` : ""}
<p style="margin:0;font-size:13px"><a href="${esc(ctx.unsubscribePageUrl)}" style="color:#4a5a6d">Unsubscribe</a></p>
</div></body></html>`;
}

function toText(blocks: Block[], ctx: EmailCtx): string {
  const body = blocks.map((b) => {
    switch (b.t) {
      case "p": return b.text;
      case "h": return `${b.text}\n${"-".repeat(Math.min(b.text.length, 40))}`;
      case "btn": return `${b.label}: ${b.url}`;
      case "items": return b.items.map((i) => `- ${i.label}${i.detail ? ` (${i.detail})` : ""}${i.url ? `\n  ${i.url}` : ""}`).join("\n");
    }
  }).join("\n\n");
  return `${body}

--
You’re getting this because you asked Rigfriend to email you a build. Rigfriend earns a commission if you buy through links on our site, at no extra cost to you.
${ctx.mailingAddress ? `${ctx.mailingAddress}\n` : ""}Unsubscribe: ${ctx.unsubscribePageUrl}`;
}

export function renderEmail(step: number, ctx: EmailCtx): RenderedEmail {
  const { subject, blocks } = emailFor(step, ctx);
  return { subject, html: toHtml(blocks, ctx), text: toText(blocks, ctx) };
}
