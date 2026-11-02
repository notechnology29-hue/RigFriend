-- =============================================================
-- 011: which store each product links to, so the site can follow each
-- affiliate agreement (zZounds hides prices, B&H may show them, and so on).
-- Set it from the admin Links tab when you paste a product's affiliate link.
-- Run after 010.
-- =============================================================
alter table public.tracked_products add column if not exists retailer text
  check (retailer in ('zzounds','bh','sweetwater','vendor'));
alter table public.gear_items add column if not exists retailer text
  check (retailer in ('zzounds','bh','sweetwater','vendor'));

update public.tracked_products set retailer = 'vendor' where niche = 'saas' and retailer is null;

-- The 3-argument version is replaced by one that also sets the store.
drop function if exists public.set_product_links(text, text, text);

create or replace function public.set_product_links(
  p_slug text, p_affiliate_url text default null, p_product_url text default null, p_retailer text default null
) returns text
language plpgsql as $$
declare hw int := 0; sw int := 0;
begin
  p_affiliate_url := nullif(trim(p_affiliate_url), '');
  p_product_url := nullif(trim(p_product_url), '');
  p_retailer := nullif(trim(p_retailer), '');
  if not exists (select 1 from public.tracked_products where slug = p_slug) then
    return 'No product called ' || p_slug;
  end if;
  if p_affiliate_url is not null and p_affiliate_url !~* '^https://[^\s]+$' then
    return 'The affiliate link must be a full https:// address';
  end if;
  if p_product_url is not null and p_product_url !~* '^https://[^\s]+$' then
    return 'The product page must be a full https:// address';
  end if;
  if p_retailer is not null and p_retailer not in ('zzounds','bh','sweetwater','vendor') then
    return 'Unknown store: ' || p_retailer;
  end if;

  update public.tracked_products
     set affiliate_url = coalesce(p_affiliate_url, affiliate_url),
         product_url   = coalesce(p_product_url, product_url),
         retailer      = coalesce(p_retailer, retailer)
   where slug = p_slug;

  if p_affiliate_url is not null or p_retailer is not null then
    update public.gear_items
       set affiliate_url = coalesce(p_affiliate_url, affiliate_url),
           retailer      = coalesce(p_retailer, retailer)
     where slug = p_slug;

    update public.hardware_bundles hb set components = (
      select jsonb_agg(case when e.elem->>'product_slug' = p_slug
                            then e.elem
                                 || case when p_affiliate_url is not null then jsonb_build_object('affiliate_url', p_affiliate_url) else '{}'::jsonb end
                                 || case when p_retailer is not null then jsonb_build_object('retailer', p_retailer) else '{}'::jsonb end
                            else e.elem end
                       order by e.ord)
      from jsonb_array_elements(hb.components) with ordinality e(elem, ord))
    where hb.components @> jsonb_build_array(jsonb_build_object('product_slug', p_slug));
    get diagnostics hw = row_count;

    update public.saas_bundles sb set tools = (
      select jsonb_agg(case when e.elem->>'product_slug' = p_slug
                            then e.elem
                                 || case when p_affiliate_url is not null then jsonb_build_object('affiliate_url', p_affiliate_url) else '{}'::jsonb end
                                 || case when p_retailer is not null then jsonb_build_object('retailer', p_retailer) else '{}'::jsonb end
                            else e.elem end
                       order by e.ord)
      from jsonb_array_elements(sb.tools) with ordinality e(elem, ord))
    where sb.tools @> jsonb_build_array(jsonb_build_object('product_slug', p_slug));
    get diagnostics sw = row_count;
  end if;

  return 'Saved ' || p_slug ||
    case when hw + sw > 0 then ' (updated in ' || (hw + sw) || ' bundle' || case when hw + sw = 1 then '' else 's' end || ')' else '' end;
end $$;

revoke execute on function public.set_product_links(text, text, text, text) from public, anon, authenticated;

-- Software is sold by its maker; mark the tools inside software bundles too.
update public.saas_bundles sb set tools = (
  select jsonb_agg(case when e.elem ? 'retailer' then e.elem else e.elem || '{"retailer":"vendor"}'::jsonb end order by e.ord)
  from jsonb_array_elements(sb.tools) with ordinality e(elem, ord));
