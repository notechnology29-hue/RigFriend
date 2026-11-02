import { ImageResponse } from "next/og";

// Link-preview images (1200x630), drawn in the Rigfriend brand: paper ground, ink type,
// the meter-smile mark, and a level meter along the bottom.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const C = { paper: "#f5f7f9", ink: "#1b2838", muted: "#4a5a6d", line: "#c9d1d9", signal: "#e3a23b", savings: "#2f7d74" };

const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"> <rect width="96" height="96" rx="22" fill="#1B2838"/> <circle cx="34" cy="36" r="6" fill="#F5F7F9"/> <circle cx="62" cy="36" r="6" fill="#F5F7F9"/> <rect x="65.1" y="52.8" width="10" height="9" rx="2.5" fill="#E3A23B" transform="rotate(121.1 70.1 57.3)"/> <rect x="55.9" y="61.4" width="10" height="9" rx="2.5" fill="#E3A23B" transform="rotate(152.1 60.9 65.9)"/> <rect x="43.0" y="64.5" width="10" height="9" rx="2.5" fill="#E3A23B" transform="rotate(180.0 48.0 69.0)"/> <rect x="30.1" y="61.4" width="10" height="9" rx="2.5" fill="#E3A23B" transform="rotate(-152.1 35.1 65.9)"/> <rect x="20.9" y="52.8" width="10" height="9" rx="2.5" fill="#E3A23B" transform="rotate(-121.1 25.9 57.3)"/> </svg>`;
const MARK = `data:image/svg+xml;base64,${btoa(MARK_SVG)}`;

// Fetches just the glyphs we need from Google Fonts as TTF (the image renderer can't read WOFF2).
async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!src) throw new Error(`No TTF for ${family}`);
  return (await fetch(src[1])).arrayBuffer();
}

export async function renderOg({ kicker, title, detail, level = 0.7 }: {
  kicker?: string; title: string; detail?: string; level?: number;
}) {
  const displayText = `rigfriend${title}`;
  const bodyText = `${kicker ?? ""}${detail ?? ""}`;
  const fonts: { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[] = [];
  try {
    const [display, body] = await Promise.all([
      googleFont("Barlow Condensed", 700, displayText),
      bodyText ? googleFont("IBM Plex Sans", 400, bodyText) : Promise.resolve(null),
    ]);
    fonts.push({ name: "Display", data: display, weight: 700, style: "normal" });
    if (body) fonts.push({ name: "Body", data: body, weight: 400, style: "normal" });
  } catch {
    // Falls back to the renderer's built-in sans if Google Fonts can't be reached.
  }

  const titleSize = title.length > 44 ? 72 : title.length > 28 ? 86 : 100;
  const segments = 24;
  const lit = Math.round(segments * Math.min(1, Math.max(0, level)));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: C.paper, padding: "60px 72px 56px", color: C.ink, fontFamily: "Body" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={MARK} width={64} height={64} style={{ borderRadius: 14 }} />
          <div style={{ marginLeft: 18, fontFamily: "Display", fontSize: 46, fontWeight: 700 }}>rigfriend</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
          {kicker ? <div style={{ fontSize: 30, color: C.muted }}>{kicker}</div> : null}
          <div style={{ marginTop: kicker ? 10 : 0, fontFamily: "Display", fontSize: titleSize, fontWeight: 700, lineHeight: 0.95 }}>{title}</div>
          {detail ? <div style={{ marginTop: 22, fontSize: 32, color: C.muted }}>{detail}</div> : null}
        </div>

        <div style={{ display: "flex" }}>
          {Array.from({ length: segments }, (_, i) => (
            <div key={i} style={{ width: 38, height: 18, marginRight: i < segments - 1 ? 8 : 0, borderRadius: 4, background: i < lit ? (i >= lit - 3 ? C.savings : C.signal) : C.line }} />
          ))}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined }
  );
}
