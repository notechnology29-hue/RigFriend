import type { Metadata } from "next";

export const SITE_NAME = "Rigfriend";
export const siteUrl = () => (process.env.SITE_URL ?? "https://rigfriend.com").replace(/\/$/, "");

/**
 * Title, description, canonical URL and link-preview tags for one page.
 * Next.js replaces (doesn't merge) a parent's openGraph, so every page builds its own here.
 * The preview image comes from the nearest opengraph-image.tsx file automatically.
 * Never put store names (B&H, zZounds) in titles or descriptions: the B&H
 * agreement bans its trademarks in page titles and meta tags.
 */
export function pageMeta({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: SITE_NAME, type: "website", locale: "en_US" },
    twitter: { card: "summary_large_image", title, description },
  };
}
