import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Handles both the button on /unsubscribe and mail apps' one-click unsubscribe.
// GET does nothing on purpose: link scanners open URLs and would unsubscribe people.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const body = await req.text().catch(() => "");

  if (UUID.test(token)) {
    const db = supabaseAdmin();
    const { data } = await db.from("leads").select("email").eq("unsubscribe_token", token).maybeSingle();
    if (data?.email) {
      await db
        .from("leads")
        .update({ unsubscribed_at: new Date().toISOString(), next_send_at: null })
        .eq("email", data.email)
        .is("unsubscribed_at", null);
    }
  }

  if (body.includes("List-Unsubscribe=One-Click")) return new Response("Unsubscribed", { status: 200 });
  return NextResponse.redirect(new URL("/unsubscribe?done=1", req.url), 303);
}
