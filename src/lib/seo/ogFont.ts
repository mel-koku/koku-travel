import { logger } from "@/lib/logger";

/**
 * Fetch a TTF buffer for a Google Font weight, subset to the exact glyphs
 * needed. Satori (which powers next/og) only supports TTF/OTF/WOFF; Google
 * Fonts serves WOFF2 by default, so we force TTF by sending an old User-Agent.
 *
 * Returns null on failure so OG routes can fall back to a system font.
 */
export async function loadGoogleFontTtf({
  family,
  weight,
  text,
}: {
  family: string;
  weight: number;
  text: string;
}): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family,
    )}:wght@${weight}&text=${encodeURIComponent(text)}`;

    const cssRes = await fetch(cssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 5.1; rv:2.0.1) Gecko/20100101 Firefox/4.0.1",
      },
      cache: "force-cache",
    });
    if (!cssRes.ok) return null;

    const css = await cssRes.text();
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('truetype'\)/);
    const ttfUrl = match?.[1];
    if (!ttfUrl) return null;

    const fontRes = await fetch(ttfUrl, { cache: "force-cache" });
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch (error) {
    logger.warn("ogFont: load failed", {
      family,
      weight,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
