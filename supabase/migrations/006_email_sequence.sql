-- =============================================================
-- 006: email sequence support on leads
-- =============================================================
alter table public.leads
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists last_sent_at timestamptz,
  add column if not exists last_error text;

create unique index if not exists leads_unsubscribe_token_idx on public.leads (unsubscribe_token);
create index if not exists leads_email_idx on public.leads (email);

-- Leads are now written only by the server (service role). Close the old public insert path.
drop policy if exists "anon insert leads" on public.leads;
