/**
 * Custom Next.js image loader.
 *
 * Sanity CDN images are routed through Sanity's own transformation pipeline
 * (?w, ?q, ?auto=format) instead of Vercel's /_next/image optimizer.
 * All other images (local paths, other remote hosts) continue through the
 * default Next.js optimizer.
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

  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
