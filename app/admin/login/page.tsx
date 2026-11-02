import { login } from "@/app/admin/actions";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-10">
      <h1 className="font-display text-4xl font-bold">Admin</h1>
      <form action={login} className="mt-6 flex flex-col gap-3">
        <label htmlFor="password" className="text-sm text-ink-muted">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
               className="min-h-11 rounded-control border border-control-border bg-paper px-3 text-base" />
        {error && <p className="text-sm text-overload">That password didn’t work.</p>}
        <button type="submit" className="min-h-11 rounded-control bg-ink px-5 text-paper">Sign in</button>
      </form>
    </div>
  );
}
