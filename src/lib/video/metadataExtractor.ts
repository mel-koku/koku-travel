/**
 * Video metadata extraction via oEmbed APIs with HTML meta tag fallback.
 *
 * Fetches video metadata (title, description, thumbnail, author) from
 * YouTube, TikTok, and Instagram. Uses oEmbed first, falls back to
 * Open Graph meta tags from the page HTML when oEmbed fails (e.g.
 * Instagram without an access token).
 */

import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { logger } from "@/lib/logger";
import { detectPlatform, getOEmbedUrl, extractHashtags, type VideoPlatform } from "./platforms";

const OEMBED_TIMEOUT_MS = 10_000;

export type VideoMetadata = {
  platform: VideoPlatform;
  title: string;
  description: string;
  authorName: string;
  thumbnailUrl: string | null;
  hashtags: string[];
  originalUrl: string;
};

type OEmbedResponse = {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
  provider_name?: string;
};

/**
 * Extract metadata from a video URL.
 * Tries oEmbed first, falls back to HTML Open Graph meta tags.
 *
 * @param url - The video URL to extract metadata from
 * @returns VideoMetadata or null if all extraction methods fail
 */
export async function extractVideoMetadata(url: string): Promise<VideoMetadata | null> {
  const platform = detectPlatform(url);
  if (!platform) {
    return null;
  }

  // Try oEmbed first
  const oEmbedResult = await tryOEmbed(url, platform);
  if (oEmbedResult) {
    return oEmbedResult;
  }

  // Fallback: fetch page HTML and extract Open Graph meta tags
  const ogResult = await tryOpenGraphFallback(url, platform);
  if (ogResult) {
    return ogResult;
  }

  logger.warn("[extractVideoMetadata] All extraction methods failed", {
    platform,
    url: url.substring(0, 100),
  });
  return null;
}

/**
 * Try extracting metadata via oEmbed API.
 */
async function tryOEmbed(url: string, platform: VideoPlatform): Promise<VideoMetadata | null> {
  const oEmbedUrl = getOEmbedUrl(url);
  if (!oEmbedUrl) return null;

  try {
    const response = await fetchWithTimeout(oEmbedUrl, {
      headers: { Accept: "application/json" },
    }, OEMBED_TIMEOUT_MS);

    if (!response.ok) {
      logger.warn("[extractVideoMetadata] oEmbed request failed", {
        platform,
        status: response.status,
        url: url.substring(0, 100),
      });
      return null;
    }

    const data = (await response.json()) as OEmbedResponse;
    const title = data.title ?? "";
    const authorName = data.author_name ?? "";

    const combinedText = `${title} ${authorName}`;
    const hashtags = extractHashtags(combinedText);

    return {
      platform,
      title,
      description: "",
      authorName,
      thumbnailUrl: data.thumbnail_url ?? null,
      hashtags,
      originalUrl: url,
    };
  } catch (error) {
    logger.warn("[extractVideoMetadata] oEmbed fetch error", {
      platform,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Fallback: fetch the page HTML and extract Open Graph meta tags.
 * Works for Instagram reels, TikTok, and most social media pages
 * that serve og:title / og:description / og:image in their HTML.
 */
async function tryOpenGraphFallback(url: string, platform: VideoPlatform): Promise<VideoMetadata | null> {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        // Pretend to be a social media crawler to get full OG tags
        "User-Agent": "facebookexternalhit/1.1",
        Accept: "text/html",
      },
      redirect: "follow",
    }, OEMBED_TIMEOUT_MS);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    const title = extractMetaContent(html, "og:title") || extractMetaContent(html, "title") || "";
    const description = extractMetaContent(html, "og:description") || "";
    const thumbnailUrl = extractMetaContent(html, "og:image") || null;
    const authorName = extractMetaContent(html, "og:site_name") || platform;

    // Need at least a title to be useful for Gemini
    if (!title) {
      return null;
    }

    const combinedText = `${title} ${description}`;
    const hashtags = extractHashtags(combinedText);

    return {
      platform,
      title,
      description,
      authorName,
      thumbnailUrl,
      hashtags,
      originalUrl: url,
    };
  } catch (error) {
    logger.warn("[extractVideoMetadata] OG fallback fetch error", {
      platform,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Extract content from an Open Graph or standard meta tag in raw HTML.
 * Handles both `<meta property="og:title" content="...">` and
 * `<meta name="title" content="...">` formats, with flexible quoting.
 */
function extractMetaContent(html: string, property: string): string | null {
  // Match property="og:title" or name="title" with content="..."
  // Handles single/double quotes and varying attribute order
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escapeRegex(property)}["'][^>]+content=["']([^"']*?)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+(?:property|name)=["']${escapeRegex(property)}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }
  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
