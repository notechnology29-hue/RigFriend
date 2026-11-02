-- =============================================================
-- 007: put the gear catalog under the weekly price checker
--  1. gear_items join tracked_products (same slug), so the n8n agent checks them
--  2. a price the agent confirms (within 2% / $2 of the approved price) counts as checked
--  3. approved or confirmed prices flow back to gear_items and every bundle
--  4. a bundle's "checked" date is now its OLDEST component check, and stays
--     empty until every component has been checked
-- Run after 004 and 005. Keep the 2% / $2 tolerance in step with the n8n "Check pages" node.
-- =============================================================

-- 1. Track sellable gear ------------------------------------------------------
create or replace function public.sync_gear_products() returns int
language plpgsql as $$
declare added int;
begin
  insert into public.tracked_products (slug, name, niche, affiliate_url, approved_price_usd, price_source)
  select slug, name, 'hardware', affiliate_url, price_usd, 'jsonld'
  from public.gear_items
  where is_active and sold_new and not is_generic and affiliate_url is not null
  on conflict (slug) do nothing;
  get diagnostics added = row_count;
  return added;
end $$;

-- 2. Same as 004, plus: a fetched price within tolerance confirms the approved price.
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
      last_checked_at     = coalesce((r->>'checked_at')::timestamptz, now()),
      price_confirmed_at  = case
        when (r->>'price') is not null and approved_price_usd is not null
         and abs((r->>'price')::numeric - approved_price_usd) <= greatest(2, approved_price_usd * 0.02)
        then now() else price_confirmed_at end
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

-- 4. Same as 004, but the checked date is the oldest component confirmation (null if any is unchecked).
create or replace function public.refresh_bundle_prices(p_slug text) returns void
language sql as $$
  with ex as (
    select hb.id, e.ord, e.elem, tp.approved_price_usd as unit_price,
           coalesce((e.elem->>'qty')::int, 1) as qty, tp.price_confirmed_at as confirmed
    from public.hardware_bundles hb
    cross join lateral jsonb_array_elements(hb.components) with ordinality e(elem, ord)
    left join public.tracked_products tp on tp.slug = e.elem->>'product_slug'
    where hb.components @> jsonb_build_array(jsonb_build_object('product_slug', p_slug))
  ), rebuilt as (
    select id,
      jsonb_agg(case when unit_price is null then elem
                     else jsonb_set(elem, '{price_usd}', to_jsonb(unit_price * qty)) end order by ord) as components,
      sum(coalesce(unit_price * qty, (elem->>'price_usd')::numeric)) as total,
      case when bool_or(confirmed is null) then null else min(confirmed) end as checked
    from ex group by id
  )
  update public.hardware_bundles hb
     set components = r.components, cash_price_usd = r.total, price_checked_at = r.checked
    from rebuilt r where hb.id = r.id;

  with ex as (
    select sb.id, e.ord, e.elem, tp.approved_price_usd as price, tp.price_confirmed_at as confirmed
    from public.saas_bundles sb
    cross join lateral jsonb_array_elements(sb.tools) with ordinality e(elem, ord)
    left join public.tracked_products tp on tp.slug = e.elem->>'product_slug'
    where sb.tools @> jsonb_build_array(jsonb_build_object('product_slug', p_slug))
  ), rebuilt as (
    select id,
      jsonb_agg(case when price is null then elem
                     else jsonb_set(elem, '{monthly_price_usd}', to_jsonb(price)) end order by ord) as tools,
      sum(coalesce(price, (elem->>'monthly_price_usd')::numeric)) as total,
      case when bool_or(confirmed is null) then null else min(confirmed) end as checked
    from ex group by id
  )
  update public.saas_bundles sb
     set tools = r.tools, monthly_price_usd = r.total, price_checked_at = r.checked
    from rebuilt r where sb.id = r.id;
$$;

-- 3. Push approved/confirmed prices out to the catalog and bundles ------------------
create or replace function public.tracked_product_price_sync() returns trigger
language plpgsql as $$
begin
  if new.approved_price_usd is distinct from old.approved_price_usd
     or new.price_confirmed_at is distinct from old.price_confirmed_at then
    update public.gear_items
       set price_usd = new.approved_price_usd, price_checked_at = new.price_confirmed_at
     where slug = new.slug;
    perform public.refresh_bundle_prices(new.slug);
  end if;
  return null;
end $$;

drop trigger if exists tracked_product_price_sync on public.tracked_products;
create trigger tracked_product_price_sync
  after update on public.tracked_products
  for each row execute function public.tracked_product_price_sync();

revoke execute on function public.sync_gear_products()           from public, anon, authenticated;
revoke execute on function public.record_check_results(jsonb)    from public, anon, authenticated;
revoke execute on function public.refresh_bundle_prices(text)    from public, anon, authenticated;
revoke execute on function public.tracked_product_price_sync()   from public, anon, authenticated;

select public.sync_gear_products();
