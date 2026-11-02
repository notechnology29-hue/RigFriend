-- =============================================================
-- 004: price & link checker
-- One row per real product (deduped across bundles), a review queue
-- the n8n agent writes to, and functions to approve or dismiss flags.
-- Nothing the agent finds changes live prices until you approve it.
-- Run after 003.
-- =============================================================

create or replace function public.slugify(t text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(t), '[^a-z0-9]+', '-', 'g'))
$$;

-- ---------- Products the agent tracks ----------
create table if not exists public.tracked_products (
  slug                 text primary key,
  name                 text not null,
  niche                text not null check (niche in ('saas','hardware')),
  product_url          text,        -- retailer/vendor page the agent reads (NOT the affiliate link)
  affiliate_url        text,
  price_source         text not null default 'jsonld' check (price_source in ('jsonld','manual')),
  approved_price_usd   numeric(10,2),   -- the price your site shows
  price_confirmed_at   timestamptz,
  last_seen_price_usd  numeric(10,2),
  last_availability    text,
  last_http_status     int,
  last_checked_at      timestamptz,
  is_active            boolean not null default true
);

-- ---------- Review queue ----------
create table if not exists public.review_queue (
  id            uuid primary key default gen_random_uuid(),
  product_slug  text not null references public.tracked_products(slug) on delete cascade,
  issue_type    text not null check (issue_type in (
                  'price_change','out_of_stock','dead_link','blocked','no_price',
                  'bad_affiliate_link','missing_product_url','confirm_price')),
  old_value     text,
  new_value     text,
  details       text,
  status        text not null default 'open' check (status in ('open','approved','dismissed','cleared')),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  resolved_at   timestamptz
);
-- At most one open issue of each type per product, so weekly runs don't pile up duplicates.
create unique index if not exists review_queue_one_open
  on public.review_queue (product_slug, issue_type) where status = 'open';

alter table public.tracked_products enable row level security;
alter table public.review_queue     enable row level security;
-- No policies: only the service role (n8n, you in the dashboard) can touch these.

-- ---------- Build tracked_products from bundle components ----------
-- Safe to re-run after adding bundles: existing products and links are kept.
create or replace function public.sync_tracked_products() returns int
language plpgsql as $$
declare added int;
begin
  drop table if exists _items;
  create temp table _items on commit drop as
  select x.*, x.line_price / x.qty as unit_price, public.slugify(x.clean_name) as base
  from (
    select 'hardware'::text as niche, hb.id as bundle_id, e.ord,
           regexp_replace(e.elem->>'name', '\s+x(\d+)$', '') as clean_name,
           coalesce(substring(e.elem->>'name' from '\s+x(\d+)$')::int, 1) as qty,
           (e.elem->>'price_usd')::numeric as line_price,
           e.elem->>'affiliate_url' as aff
    from public.hardware_bundles hb,
         jsonb_array_elements(hb.components) with ordinality e(elem, ord)
    union all
    select 'saas', sb.id, e.ord, e.elem->>'name', 1,
           (e.elem->>'monthly_price_usd')::numeric, e.elem->>'affiliate_url'
    from public.saas_bundles sb,
         jsonb_array_elements(sb.tools) with ordinality e(elem, ord)
  ) x;

  -- Same name at different prices = different plans/tiers, so give each its own slug.
  alter table _items add column slug text;
  update _items i set slug = i.base || case when m.multi then '-' || round(i.unit_price)::text else '' end
  from (select niche, base, count(distinct unit_price) > 1 as multi
        from _items group by niche, base) m
  where m.niche = i.niche and m.base = i.base;

  insert into public.tracked_products (slug, name, niche, affiliate_url, approved_price_usd, price_source)
  select distinct on (slug) slug, clean_name, niche, aff, unit_price,
         case when niche = 'saas' then 'manual' else 'jsonld' end
  from _items order by slug
  on conflict (slug) do nothing;
  get diagnostics added = row_count;

  update public.hardware_bundles hb set components = (
    select jsonb_agg(case when e.elem ? 'product_slug' then e.elem
                          else e.elem || jsonb_build_object('product_slug', i.slug, 'qty', i.qty) end
                     order by e.ord)
    from jsonb_array_elements(hb.components) with ordinality e(elem, ord)
    join _items i on i.niche = 'hardware' and i.bundle_id = hb.id and i.ord = e.ord)
  where exists (select 1 from jsonb_array_elements(hb.components) c where not c ? 'product_slug');

  update public.saas_bundles sb set tools = (
    select jsonb_agg(case when e.elem ? 'product_slug' then e.elem
                          else e.elem || jsonb_build_object('product_slug', i.slug) end
                     order by e.ord)
    from jsonb_array_elements(sb.tools) with ordinality e(elem, ord)
    join _items i on i.niche = 'saas' and i.bundle_id = sb.id and i.ord = e.ord)
  where exists (select 1 from jsonb_array_elements(sb.tools) c where not c ? 'product_slug');

  return added;
end $$;

-- ---------- Recalculate bundle prices from approved product prices ----------
create or replace function public.refresh_bundle_prices(p_slug text) returns void
language sql as $$
  with ex as (
    select hb.id, e.ord, e.elem, tp.approved_price_usd as unit_price,
           coalesce((e.elem->>'qty')::int, 1) as qty
    from public.hardware_bundles hb
    cross join lateral jsonb_array_elements(hb.components) with ordinality e(elem, ord)
    left join public.tracked_products tp on tp.slug = e.elem->>'product_slug'
    where hb.components @> jsonb_build_array(jsonb_build_object('product_slug', p_slug))
  ), rebuilt as (
    select id,
      jsonb_agg(case when unit_price is null then elem
                     else jsonb_set(elem, '{price_usd}', to_jsonb(unit_price * qty)) end order by ord) as components,
      sum(coalesce(unit_price * qty, (elem->>'price_usd')::numeric)) as total
    from ex group by id
  )
  update public.hardware_bundles hb
     set components = r.components, cash_price_usd = r.total, price_checked_at = now()
    from rebuilt r where hb.id = r.id;

  with ex as (
    select sb.id, e.ord, e.elem, tp.approved_price_usd as price
    from public.saas_bundles sb
    cross join lateral jsonb_array_elements(sb.tools) with ordinality e(elem, ord)
    left join public.tracked_products tp on tp.slug = e.elem->>'product_slug'
    where sb.tools @> jsonb_build_array(jsonb_build_object('product_slug', p_slug))
  ), rebuilt as (
    select id,
      jsonb_agg(case when price is null then elem
                     else jsonb_set(elem, '{monthly_price_usd}', to_jsonb(price)) end order by ord) as tools,
      sum(coalesce(price, (elem->>'monthly_price_usd')::numeric)) as total
    from ex group by id
  )
  update public.saas_bundles sb
     set tools = r.tools, monthly_price_usd = r.total, price_checked_at = now()
    from rebuilt r where sb.id = r.id;
$$;

-- ---------- Called by the n8n agent once per run ----------
-- Saves check results, opens new issues, clears issues that resolved themselves,
-- and returns only the NEW issues (so you're emailed once per problem).
create or replace function public.record_check_results(results jsonb) returns jsonb
language plpgsql as $$
declare
  r jsonb; i jsonb; ins record;
  new_issues jsonb := '[]'::jsonb;
  reported text[];
  fetched_ok boolean;
begin
  for r in select value from jsonb_array_elements(results) loop
    update public.tracked_products set
      last_http_status    = (r->>'http_status')::int,
      last_seen_price_usd = coalesce((r->>'price')::numeric, last_seen_price_usd),
      last_availability   = coalesce(r->>'availability', last_availability),
      last_checked_at     = coalesce((r->>'checked_at')::timestamptz, now())
    where slug = r->>'slug';

    reported := array(select value->>'type' from jsonb_array_elements(coalesce(r->'issues', '[]'::jsonb)));
    fetched_ok := coalesce((r->>'http_status')::int between 200 and 399, false);

    for i in select value from jsonb_array_elements(coalesce(r->'issues', '[]'::jsonb)) loop
      insert into public.review_queue (product_slug, issue_type, old_value, new_value, details)
      values (r->>'slug', i->>'type', i->>'old_value', i->>'new_value', i->>'details')
      on conflict (product_slug, issue_type) where status = 'open'
      do update set new_value = excluded.new_value, details = excluded.details, last_seen_at = now()
      returning id, (xmax = 0) as is_new into ins;

      if ins.is_new then
        new_issues := new_issues || jsonb_build_object(
          'id', ins.id, 'product_slug', r->>'slug',
          'product_name', (select name from public.tracked_products where slug = r->>'slug'),
          'issue_type', i->>'type', 'old_value', i->>'old_value',
          'new_value', i->>'new_value', 'details', i->>'details');
      end if;
    end loop;

    update public.review_queue set status = 'cleared', resolved_at = now()
    where product_slug = r->>'slug' and status = 'open'
      and not (issue_type = any(reported))
      and (issue_type in ('bad_affiliate_link','missing_product_url')
           or (fetched_ok and issue_type in ('price_change','out_of_stock','dead_link','blocked','no_price')));
  end loop;
  return new_issues;
end $$;

-- ---------- You run these from the SQL editor (or a future admin page) ----------
-- select * from review_queue where status = 'open' order by created_at;
-- select approve_review('<id>');   select dismiss_review('<id>');
create or replace function public.approve_review(review_id uuid) returns text
language plpgsql as $$
declare q public.review_queue;
begin
  select * into q from public.review_queue where id = review_id and status = 'open' for update;
  if not found then return 'No open review with that id'; end if;

  if q.issue_type = 'price_change' then
    update public.tracked_products
       set approved_price_usd = q.new_value::numeric, price_confirmed_at = now()
     where slug = q.product_slug;
    perform public.refresh_bundle_prices(q.product_slug);
  elsif q.issue_type = 'confirm_price' then
    update public.tracked_products set price_confirmed_at = now() where slug = q.product_slug;
    perform public.refresh_bundle_prices(q.product_slug);
  elsif q.issue_type in ('out_of_stock','dead_link') then
    -- Approving means "yes, it's really gone": pause every bundle that uses it.
    update public.hardware_bundles set is_active = false,
           review_note = 'Paused: ' || q.product_slug || ' ' || q.issue_type
     where components @> jsonb_build_array(jsonb_build_object('product_slug', q.product_slug));
    update public.saas_bundles set is_active = false
     where tools @> jsonb_build_array(jsonb_build_object('product_slug', q.product_slug));
  end if;

  update public.review_queue set status = 'approved', resolved_at = now() where id = review_id;
  return 'Approved ' || q.issue_type || ' for ' || q.product_slug;
end $$;

create or replace function public.dismiss_review(review_id uuid) returns text
language sql as $$
  update public.review_queue set status = 'dismissed', resolved_at = now()
  where id = review_id and status = 'open'
  returning 'Dismissed ' || issue_type || ' for ' || product_slug;
$$;

-- Keep every function away from the public API keys.
revoke execute on function public.sync_tracked_products()           from public, anon, authenticated;
revoke execute on function public.refresh_bundle_prices(text)       from public, anon, authenticated;
revoke execute on function public.record_check_results(jsonb)       from public, anon, authenticated;
revoke execute on function public.approve_review(uuid)              from public, anon, authenticated;
revoke execute on function public.dismiss_review(uuid)              from public, anon, authenticated;

-- Populate from the bundles already seeded.
select public.sync_tracked_products();
