import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

async function loadCormorant(text: string) {
  const url = `https://fonts.googleapis.com/css2?family=Cormorant:wght@500&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  const fontUrl = resource?.[1];
  if (!fontUrl) return null;
  const res = await fetch(fontUrl);
  if (!res.ok) return null;
  return await res.arrayBuffer();
}

export default async function AppleIcon() {
  const fontData = await loadCormorant("Y").catch(() => null);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#E23828",
          color: "#FAF8F5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fontData ? "Cormorant" : "serif",
          fontSize: 140,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        Y
      </div>
    ),
    {
      ...size,
      ...(fontData
        ? { fonts: [{ name: "Cormorant", data: fontData, weight: 500, style: "normal" }] }
        : {}),
    }
  );
}
