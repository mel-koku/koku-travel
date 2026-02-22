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

    let title = extractMetaContent(html, "og:title") || extractMetaContent(html, "twitter:title") || extractMetaContent(html, "title") || "";
    let description = extractMetaContent(html, "og:description") || extractMetaContent(html, "twitter:description") || "";
    const thumbnailUrl = extractMetaContent(html, "og:image") || null;
    const authorName = extractMetaContent(html, "og:site_name") || platform;

    // For Instagram, try to extract richer data from embedded scripts
    if (platform === "instagram") {
      const scriptData = tryExtractInstagramScriptData(html);
      if (scriptData) {
        if (scriptData.title && (!title || title.length < scriptData.title.length)) {
          title = scriptData.title;
        }
        if (scriptData.description && (!description || description.length < scriptData.description.length)) {
          description = scriptData.description;
        }
      }
    }

    // Need at least a title or thumbnail to be useful for Gemini
    if (!title && !thumbnailUrl) {
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
 * Try to extract richer metadata from Instagram's embedded script tags.
 * Instagram pages may contain JSON-LD or embedded JS data with captions/descriptions
 * that aren't exposed in meta tags.
 */
function tryExtractInstagramScriptData(html: string): { title?: string; description?: string } | null {
  try {
    // Try JSON-LD structured data
    const ldJsonMatch = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (ldJsonMatch?.[1]) {
      try {
        const ld = JSON.parse(ldJsonMatch[1]);
        const result: { title?: string; description?: string } = {};
        if (typeof ld.name === "string" && ld.name.length > 5) {
          result.title = ld.name.substring(0, 500);
        }
        if (typeof ld.description === "string" && ld.description.length > 5) {
          result.description = ld.description.substring(0, 1000);
        }
        // Also check articleBody or caption
        if (typeof ld.articleBody === "string" && ld.articleBody.length > (result.description?.length ?? 0)) {
          result.description = ld.articleBody.substring(0, 1000);
        }
        if (typeof ld.caption === "string" && ld.caption.length > (result.description?.length ?? 0)) {
          result.description = ld.caption.substring(0, 1000);
        }
        if (result.title || result.description) return result;
      } catch {
        // Invalid JSON, continue to next strategy
      }
    }

    // Try embedded data patterns (window.__additionalDataLoaded, window._sharedData)
    const dataPatterns = [
      /window\.__additionalDataLoaded\s*\(\s*['"][^'"]*['"]\s*,\s*({[\s\S]*?})\s*\)\s*;/,
      /window\._sharedData\s*=\s*({[\s\S]*?})\s*;/,
    ];

    for (const pattern of dataPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        try {
          const data = JSON.parse(match[1]);
          // Navigate common Instagram data shapes for caption text
          const caption = findNestedCaption(data);
          if (caption && caption.length > 10) {
            return { description: caption.substring(0, 1000) };
          }
        } catch {
          // Invalid JSON, try next pattern
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Recursively search Instagram embedded JSON for caption text.
 * Instagram nests captions at varying depths depending on the data structure version.
 */
function findNestedCaption(obj: unknown, depth = 0): string | null {
  if (depth > 8 || !obj || typeof obj !== "object") return null;

  const record = obj as Record<string, unknown>;

  // Direct caption fields
  if (typeof record.caption === "string" && record.caption.length > 10) {
    return record.caption;
  }
  // Caption as object with text field
  if (record.caption && typeof record.caption === "object") {
    const captionObj = record.caption as Record<string, unknown>;
    if (typeof captionObj.text === "string" && captionObj.text.length > 10) {
      return captionObj.text;
    }
  }
  // Edge/node caption patterns
  if (typeof record.text === "string" && record.text.length > 10) {
    return record.text;
  }

  // Recurse into common Instagram data paths
  for (const key of ["edge_media_to_caption", "edges", "node", "media", "shortcode_media", "graphql"]) {
    if (record[key]) {
      if (Array.isArray(record[key])) {
        for (const item of record[key] as unknown[]) {
          const result = findNestedCaption(item, depth + 1);
          if (result) return result;
        }
      } else {
        const result = findNestedCaption(record[key], depth + 1);
        if (result) return result;
      }
    }
  }

  return null;
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
