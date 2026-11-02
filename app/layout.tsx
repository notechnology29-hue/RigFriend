import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Sans } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { pageMeta, siteUrl } from "@/lib/seo";
import "./globals.css";

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
  display: "swap",
});

const home = pageMeta({
  title: "Rigfriend: find what’s holding your rig back",
  description: "Free tools for podcasters and creators: see what editing really costs you and whether your gear is the bottleneck.",
  path: "/",
});

export const metadata: Metadata = {
  ...home,
  metadataBase: new URL(siteUrl()),
  title: { default: "Rigfriend: find what’s holding your rig back", template: "%s | Rigfriend" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#121c28" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${plex.variable}`}>
      <body className="flex flex-col bg-paper text-ink antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
