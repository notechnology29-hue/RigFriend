-- =============================================================
-- 014: drop Sweetwater as a store option. Run after 013.
-- =============================================================
update public.tracked_products set retailer = null where retailer = 'sweetwater';
update public.gear_items set retailer = null where retailer = 'sweetwater';
update public.hardware_bundles hb set components = (
  select jsonb_agg(case when e.elem->>'retailer' = 'sweetwater' then e.elem - 'retailer' else e.elem end order by e.ord)
  from jsonb_array_elements(hb.components) with ordinality e(elem, ord))
where components @> '[{"retailer":"sweetwater"}]'::jsonb;

alter table public.tracked_products drop constraint if exists tracked_products_retailer_check;
alter table public.tracked_products add constraint tracked_products_retailer_check check (retailer in ('zzounds','bh','vendor'));
alter table public.gear_items drop constraint if exists gear_items_retailer_check;
alter table public.gear_items add constraint gear_items_retailer_check check (retailer in ('zzounds','bh','vendor'));

-- Same as 011, with Sweetwater removed from the allowed stores.
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
  if p_retailer is not null and p_retailer not in ('zzounds','bh','vendor') then
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
