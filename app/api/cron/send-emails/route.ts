import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LAST_STEP, nextSendAt, sendStep } from "@/lib/email/send";
import type { Lead } from "@/lib/email/context";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Sends follow-up emails 2–5. Vercel Cron calls this daily with
// "Authorization: Bearer $CRON_SECRET"; n8n or any scheduler can call it the same way.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: due, error } = await db
    .from("leads")
    .select("id, email, source_tool, build, unsubscribe_token, marketing_consent, sequence_step")
    .lte("next_send_at", new Date().toISOString())
    .is("unsubscribed_at", null)
    .eq("marketing_consent", true)
    .gte("sequence_step", 1)
    .lt("sequence_step", LAST_STEP)
    .order("next_send_at")
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0, failed = 0, skipped = 0;
  for (const lead of (due ?? []) as Lead[]) {
    // An unsubscribe from any email stops every series for that address.
    const { count } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("email", lead.email)
      .not("unsubscribed_at", "is", null);
    if (count) {
      await db.from("leads").update({ next_send_at: null }).eq("id", lead.id);
      skipped++;
      continue;
    }

    const step = lead.sequence_step + 1;
    const result = await sendStep(lead, step);
    if (result.ok) {
      await db
        .from("leads")
        .update({ sequence_step: step, last_sent_at: new Date().toISOString(), last_error: null, next_send_at: nextSendAt(step, true) })
        .eq("id", lead.id);
      sent++;
    } else {
      // Left due, so the next run retries it.
      await db.from("leads").update({ last_error: result.error }).eq("id", lead.id);
      failed++;
    }
  }
  return NextResponse.json({ sent, failed, skipped });
}
