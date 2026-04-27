/**
 * Custom Next.js image loader.
 *
 * Routes images around Vercel's /_next/image optimizer when the upstream
 * already handles resizing or the asset is small enough to serve as-is
 * (saves against the plan's monthly transformation quota):
 *   - cdn.sanity.io: served via Sanity's own ?w/?q/?auto=format pipeline
 *   - /api/places/photo: served via Google Places maxWidthPx (proxy already
 *     forwards the resize request to Google server-side)
 *   - upload.wikimedia.org: served via Wikimedia's /thumb/ CDN
 *   - /images/**: pre-sized static assets in /public, served direct
 *
 * All other sources (other remote hosts) still flow through /_next/image
 * so Vercel can optimize them.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src) return "";

  if (src.includes("cdn.sanity.io/images")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 75));
    url.searchParams.set("auto", "format");
    return url.toString();
  }

  if (src.includes("/api/places/photo")) {
    const queryStart = src.indexOf("?");
    const path = queryStart >= 0 ? src.slice(0, queryStart) : src;
    const params = new URLSearchParams(queryStart >= 0 ? src.slice(queryStart + 1) : "");
    params.set("maxWidthPx", String(width));
    return `${path}?${params.toString()}`;
  }

  // Wikimedia Commons: rewrite originals to /thumb/ URLs so resizing runs on
  // Wikimedia's CDN, not Vercel's. Already-thumb URLs pass through unchanged.
  if (src.includes("upload.wikimedia.org/wikipedia/commons/")) {
    if (src.includes("/commons/thumb/")) {
      return src;
    }
    const match = src.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f])\/([0-9a-f]{2})\/(.+)$/);
    if (!match) return src;
    const [, base, x, xx, file] = match;
    return `${base}/thumb/${x}/${xx}/${file}/${width}px-${file}`;
  }

  if (src.startsWith("/images/")) {
    return src;
  }

  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
