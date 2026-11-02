import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from "@/lib/og";

// Default preview for the homepage and any page without its own image.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Rigfriend: is editing eating your week? A free calculator for creators.";

export default function Image() {
  return renderOg({
    title: "Is editing eating your week?",
    detail: "See what editing really costs you, and the AI stack that cuts it. Free.",
    level: 0.8,
  });
}
