// Store rules from each affiliate agreement. This file is the one place to change them.
// Sweetwater was dropped (Oct 2026): every product is covered by zZounds or B&H, and its
// network (FlexOffers) added email limits and a 1% conversion floor for no gain.
//
// zZounds (agreement §6–8): no prices or stock on the site unless pulled live from zZounds;
//   no references to zZounds beyond the links themselves without written consent (so no
//   "payment plan" or "no credit check" copy); show "In affiliation with zZounds.com" plus
//   their logo; make clear zZounds is the merchant. Clicks only count from your registered
//   domains, so emails link to Rigfriend pages, never straight to zZounds.
// B&H (agreement §1–3): prices may vary, and showing checked prices isn't prohibited.
//   Never put "B&H" or its trademarks in domains, page titles, meta tags, HTML comments or
//   paid search. Keep a privacy policy. Don't block their crawler. Don't show brand logos.
// Rules that apply to every store:
//   - Affiliate links keep the referrer (rel="sponsored noopener", no "noreferrer"), because
//     zZounds credits clicks by the website they came from.
//   - Emails, social posts, bios and DM replies link to Rigfriend pages, never to a store.
//
// joined: set to true once a program approves you; it controls the footer notices.

export type RetailerId = "zzounds" | "bh" | "vendor";

type Retailer = {
  name: string;
  showPrices: boolean;
  joined: boolean;
  notice?: string;           // text the agreement requires on the site
  paymentPlanApproved?: boolean; // zZounds: set true only after written consent to mention payment plans
};

export const RETAILERS: Record<RetailerId, Retailer> = {
  zzounds: { name: "zZounds", showPrices: false, joined: false, notice: "In affiliation with zZounds.com", paymentPlanApproved: false },
  bh: { name: "B&H", showPrices: true, joined: false },
  vendor: { name: "the maker", showPrices: true, joined: true }, // software sold directly by its maker
};

export const RETAILER_OPTIONS: { id: RetailerId; label: string }[] = [
  { id: "zzounds", label: "zZounds" },
  { id: "bh", label: "B&H" },
  { id: "vendor", label: "Sold by the maker (software)" },
];

export const retailerOf = (id?: string | null) =>
  id && id in RETAILERS ? RETAILERS[id as RetailerId] : null;

/** Unknown store = hide the price. */
export const canShowPrice = (id?: string | null) => retailerOf(id)?.showPrices === true;

/** A bundle's total only shows when every part may show its price. */
export const bundlePriceVisible = (parts: { retailer?: string | null }[]) =>
  parts.length > 0 && parts.every((p) => canShowPrice(p.retailer));

/** Button text that names the store, as zZounds requires. */
export function buyLabel(id?: string | null) {
  const r = retailerOf(id);
  return r && id !== "vendor" ? `See it at ${r.name}` : "See current price";
}

export const affiliationNotices = () =>
  Object.values(RETAILERS).filter((r) => r.joined && r.notice).map((r) => r.notice as string);

export const zzoundsPaymentPlanLine = (installmentRetailer?: string | null) =>
  installmentRetailer?.toLowerCase() === "zzounds" && RETAILERS.zzounds.joined && RETAILERS.zzounds.paymentPlanApproved
    ? "Payment plans may be available at zZounds checkout."
    : null;
