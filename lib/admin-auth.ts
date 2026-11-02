import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Single-owner admin login: a password from ADMIN_PASSWORD, and a signed,
// HTTP-only cookie that lasts 14 days. No accounts, no third-party auth.
const COOKIE = "rf_admin";
const MAX_AGE_S = 60 * 60 * 24 * 14;

function secret() {
  const s = process.env.ADMIN_SECRET;
  if (!s || s.length < 32) throw new Error("ADMIN_SECRET must be set to at least 32 random characters");
  return s;
}

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function passwordMatches(input: string) {
  const pw = process.env.ADMIN_PASSWORD ?? "";
  if (pw.length < 12) return false; // refuse to run with a weak or missing password
  return safeEqual(input, pw);
}

export async function isAdmin() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function startSession() {
  const exp = String(Date.now() + MAX_AGE_S * 1000);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true, secure: true, sameSite: "strict", path: "/admin", maxAge: MAX_AGE_S,
  });
}

export async function endSession() {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}
