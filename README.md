# Rigfriend site

Next.js 15 (App Router) + Tailwind v4 + Supabase. Brand rules live in [docs/brand/README.md](docs/brand/README.md).

## Run it locally

```bash
npm install
npm run dev
```

With no Supabase keys set, `npm run dev` uses the seed catalog in `lib/demo-data.json` (the active rows from the migrations), so every page and both tools work. The email form needs Supabase and Resend, so it shows an error in this mode.

## Connect Supabase

1. Create a Supabase project and run `supabase/migrations/*.sql` in order (SQL editor or `supabase db push`).
2. Copy `.env.example` to `.env.local` and fill in the keys.
3. Restart `npm run dev`. Data now comes from the database, and the demo data is ignored.

Bundles marked as drafts in the migrations stay `is_active = false` until you review them at `/admin`. Prices stay hidden until the weekly checker (`automation/price-link-checker.json`, an n8n workflow) sets `price_checked_at`.

## Deploy (Vercel)

Import the `site` folder, add the variables from `.env.example`, and deploy. `vercel.json` schedules the daily follow-up email job at `/api/cron/send-emails`, which Vercel calls with `CRON_SECRET`.

## Where things are

| Path | What it is |
| --- | --- |
| `app/` | Pages, API routes (`api/leads`, `api/unsubscribe`, `api/cron/send-emails`), admin, OG images, sitemap |
| `components/` | ROI calculator, gear checker, build card, save-build modal, header and footer |
| `lib/gear.ts` | Pure gain and phantom-power compatibility logic |
| `lib/retailers.ts` | Affiliate program rules (which stores may show prices, required notices) |
| `lib/email/` | 5-email follow-up sequence, sent through Resend |
| `lib/demo.ts`, `lib/demo-data.json` | Local preview data, used only in dev without Supabase |
| `supabase/migrations/` | Schema and seed data, `001` to `015` |
| `docs/` | Brand guide, tokens, logo sheets, gear-list spreadsheet |
