import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Rigfriend gear check: will this mic work with that interface?";

export default function Image() {
  return renderOg({
    kicker: "Free gear check",
    title: "Will this mic work with that interface?",
    detail: "Gain, phantom power and inputs, checked in 30 seconds.",
    level: 0.6,
  });
}
