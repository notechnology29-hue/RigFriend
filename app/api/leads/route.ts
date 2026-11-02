import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { nextSendAt, sendStep } from "@/lib/email/send";
import type { Lead } from "@/lib/email/context";

const TOOLS = ["roi_calculator", "bottleneck_checker"] as const;
const MAX_BUILDS_PER_EMAIL_PER_DAY = 3; // stops the form from being used to flood someone's inbox
const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!TOOLS.includes(body.source_tool)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }
  const build = body.build && typeof body.build === "object" && !Array.isArray(body.build) ? body.build : {};
  if (JSON.stringify(build).length > 2000) {
    return NextResponse.json({ error: "Build too large" }, { status: 400 });
  }
  const consent = body.marketing_consent === true;

  const db = supabaseAdmin();
  const { data: prior, error: priorError } = await db
    .from("leads")
    .select("created_at, unsubscribed_at, marketing_consent, next_send_at")
    .eq("email", email);
  if (priorError) return NextResponse.json({ error: "Could not save" }, { status: 500 });

  const rows = prior ?? [];
  const recent = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < DAY_MS).length;
  if (recent >= MAX_BUILDS_PER_EMAIL_PER_DAY) {
    return NextResponse.json({ error: "Too many requests for this address today" }, { status: 429 });
  }

  const everUnsubscribed = rows.some((r) => r.unsubscribed_at);
  const sequenceRunning = rows.some((r) => !r.unsubscribed_at && r.marketing_consent && r.next_send_at);
  // One follow-up series per person at a time, and never after an unsubscribe.
  const continueSequence = consent && !everUnsubscribed && !sequenceRunning;

  const { data: lead, error: insertError } = await db
    .from("leads")
    .insert({
      email,
      source_tool: body.source_tool,
      build,
      marketing_consent: consent && !everUnsubscribed,
      sequence_step: 0,
      next_send_at: null,
    })
    .select("id, email, source_tool, build, unsubscribe_token, marketing_consent, sequence_step")
    .single();
  if (insertError || !lead) return NextResponse.json({ error: "Could not save" }, { status: 500 });

  // Email 1 (the build they asked for) goes out right away; 2–5 follow daily via the cron route.
  const sent = await sendStep(lead as Lead, 1);
  if (!sent.ok) {
    await db.from("leads").update({ last_error: sent.error }).eq("id", lead.id);
    return NextResponse.json({ error: "Email failed to send" }, { status: 502 });
  }
  await db
    .from("leads")
    .update({ sequence_step: 1, last_sent_at: new Date().toISOString(), last_error: null, next_send_at: nextSendAt(1, continueSequence) })
    .eq("id", lead.id);

  return NextResponse.json({ ok: true });
}
