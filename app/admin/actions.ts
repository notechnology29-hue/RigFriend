"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, passwordMatches, requireAdmin, startSession } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Every action below is a public endpoint under the hood, so each one checks the session first.

const back = (tab: string, msg: string) => redirect(`/admin?tab=${tab}&msg=${encodeURIComponent(msg)}`);
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function login(form: FormData) {
  if (!passwordMatches(str(form, "password"))) {
    await new Promise((r) => setTimeout(r, 800)); // slows down password guessing
    redirect("/admin/login?error=1");
  }
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

export async function approveReview(form: FormData) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin().rpc("approve_review", { review_id: str(form, "id") });
  revalidatePath("/", "layout"); // prices and bundles show up across the site
  back("review", error ? `Couldn’t approve: ${error.message}` : String(data));
}

export async function dismissReview(form: FormData) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin().rpc("dismiss_review", { review_id: str(form, "id") });
  back("review", error ? `Couldn’t dismiss: ${error.message}` : String(data ?? "Dismissed"));
}

export async function setBundleActive(form: FormData) {
  await requireAdmin();
  const table = str(form, "table") === "hardware" ? "hardware_bundles" : "saas_bundles";
  const slug = str(form, "slug");
  const active = str(form, "active") === "true";
  const { error } = await supabaseAdmin()
    .from(table)
    .update(active ? { is_active: true, review_note: null } : { is_active: false })
    .eq("slug", slug);
  revalidatePath("/", "layout");
  if (error) {
    const reason = /gain_ok/.test(error.message)
      ? "the mic needs more gain than this setup gives"
      : /phantom_ok/.test(error.message)
        ? "the mic needs phantom power the interface doesn’t supply"
        : error.message;
    back("bundles", `Couldn’t switch on ${slug}: ${reason}`);
  }
  back("bundles", `${slug} is now ${active ? "live" : "off"}`);
}

export async function saveLinks(form: FormData) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin().rpc("set_product_links", {
    p_slug: str(form, "slug"),
    p_affiliate_url: str(form, "affiliate_url") || null,
    p_product_url: str(form, "product_url") || null,
    p_retailer: str(form, "retailer") || null,
  });
  revalidatePath("/", "layout");
  back("links", error ? `Couldn’t save: ${error.message}` : String(data));
}
