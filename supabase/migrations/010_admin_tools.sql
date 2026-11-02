-- =============================================================
-- 010: one-call link updates for the admin page (or the SQL editor)
--   select set_product_links('shure-sm7db', 'https://your-affiliate-link', 'https://retailer-product-page');
-- Pass null for a link you don't want to change. Updates the price tracker,
-- the gear catalog and every bundle that uses the product.
-- =============================================================
create or replace function public.set_product_links(
  p_slug text, p_affiliate_url text default null, p_product_url text default null
) returns text
language plpgsql as $$
declare hw int := 0; sw int := 0;
begin
  p_affiliate_url := nullif(trim(p_affiliate_url), '');
  p_product_url := nullif(trim(p_product_url), '');
  if not exists (select 1 from public.tracked_products where slug = p_slug) then
    return 'No product called ' || p_slug;
  end if;
  if p_affiliate_url is not null and p_affiliate_url !~* '^https://[^\s]+$' then
    return 'The affiliate link must be a full https:// address';
  end if;
  if p_product_url is not null and p_product_url !~* '^https://[^\s]+$' then
    return 'The product page must be a full https:// address';
  end if;

  update public.tracked_products
     set affiliate_url = coalesce(p_affiliate_url, affiliate_url),
         product_url   = coalesce(p_product_url, product_url)
   where slug = p_slug;

  if p_affiliate_url is not null then
    update public.gear_items set affiliate_url = p_affiliate_url where slug = p_slug;

    update public.hardware_bundles hb set components = (
      select jsonb_agg(case when e.elem->>'product_slug' = p_slug
                            then jsonb_set(e.elem, '{affiliate_url}', to_jsonb(p_affiliate_url)) else e.elem end
                       order by e.ord)
      from jsonb_array_elements(hb.components) with ordinality e(elem, ord))
    where hb.components @> jsonb_build_array(jsonb_build_object('product_slug', p_slug));
    get diagnostics hw = row_count;

    update public.saas_bundles sb set tools = (
      select jsonb_agg(case when e.elem->>'product_slug' = p_slug
                            then jsonb_set(e.elem, '{affiliate_url}', to_jsonb(p_affiliate_url)) else e.elem end
                       order by e.ord)
      from jsonb_array_elements(sb.tools) with ordinality e(elem, ord))
    where sb.tools @> jsonb_build_array(jsonb_build_object('product_slug', p_slug));
    get diagnostics sw = row_count;
  end if;

  return 'Saved ' || p_slug ||
    case when p_affiliate_url is not null then ' (link updated in ' || (hw + sw) || ' bundle' || case when hw + sw = 1 then '' else 's' end || ')' else '' end;
end $$;

revoke execute on function public.set_product_links(text, text, text) from public, anon, authenticated;
