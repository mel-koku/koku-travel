/**
 * Video platform detection, URL validation, and oEmbed endpoint configuration.
 */

export type VideoPlatform = "youtube" | "tiktok" | "instagram";

type PlatformConfig = {
  patterns: RegExp[];
  oEmbedUrl: (url: string) => string;
};

const PLATFORM_CONFIGS: Record<VideoPlatform, PlatformConfig> = {
  youtube: {
    patterns: [
      /^https?:\/\/(?:www\.)?youtube\.com\/watch\?.*v=[\w-]+/,
      /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
    ],
    oEmbedUrl: (url: string) =>
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  },
  tiktok: {
    patterns: [
      /^https?:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
      /^https?:\/\/(?:vm|vt)\.tiktok\.com\/[\w]+/,
    ],
    oEmbedUrl: (url: string) =>
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  },
  instagram: {
    patterns: [
      /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels)\/[\w-]+/,
    ],
    oEmbedUrl: (url: string) => {
      const token = process.env.META_OEMBED_ACCESS_TOKEN;
      const base = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}`;
      return token ? `${base}&access_token=${token}` : base;
    },
  },
};

/**
 * Detect which video platform a URL belongs to.
 * Returns null if the URL doesn't match any supported platform.
 */
export function detectPlatform(url: string): VideoPlatform | null {
  for (const [platform, config] of Object.entries(PLATFORM_CONFIGS) as [VideoPlatform, PlatformConfig][]) {
    if (config.patterns.some((pattern) => pattern.test(url))) {
      return platform;
    }
  }
  return null;
}

/**
 * Check if a URL is a valid video URL from a supported platform.
 */
export function isValidVideoUrl(url: string): boolean {
  return detectPlatform(url) !== null;
}

/**
 * Get the oEmbed endpoint URL for a given video URL.
 * Returns null if the platform is not supported.
 */
export function getOEmbedUrl(url: string): string | null {
  const platform = detectPlatform(url);
  if (!platform) return null;
  return PLATFORM_CONFIGS[platform].oEmbedUrl(url);
}

/**
 * Extract hashtags from text (supports Japanese characters).
 */
export function extractHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g);
  return matches ? [...new Set(matches.map((tag) => tag.toLowerCase()))] : [];
}
