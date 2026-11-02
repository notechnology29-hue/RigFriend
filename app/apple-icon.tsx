import { ImageResponse } from "next/og";

// iOS home-screen icon: the same meter-smile mark as app/icon.svg, as a PNG.
// iOS rounds the corners itself, so the ink tile runs edge to edge here.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"> <rect width="96" height="96" fill="#1B2838"/> <circle cx="34" cy="36" r="6" fill="#F5F7F9"/> <circle cx="62" cy="36" r="6" fill="#F5F7F9"/> <rect x="65.1" y="52.8" width="10" height="9" rx="2.5" fill="#E3A23B" transform="rotate(121.1 70.1 57.3)"/> <rect x="55.9" y="61.4" width="10" height="9" rx="2.5" fill="#E3A23B" transform="rotate(152.1 60.9 65.9)"/> <rect x="43.0" y="64.5" width="10" height="9" rx="2.5" fill="#E3A23B" transform="rotate(180.0 48.0 69.0)"/> <rect x="30.1" y="61.4" width="10" height="9" rx="2.5" fill="#E3A23B" transform="rotate(-152.1 35.1 65.9)"/> <rect x="20.9" y="52.8" width="10" height="9" rx="2.5" fill="#E3A23B" transform="rotate(-121.1 25.9 57.3)"/> </svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    <img src={`data:image/svg+xml;base64,${btoa(MARK_SVG)}`} width={180} height={180} alt="" />,
    size
  );
}
