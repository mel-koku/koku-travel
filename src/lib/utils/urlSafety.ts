/**
 * URL validation for user-facing content rendered via react-markdown.
 * Prevents javascript:, data:, and other dangerous URI schemes from
 * being rendered as clickable links.
 */

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/**
 * Returns true if the URL is safe to render as a clickable link.
 * Allows http/https/mailto URLs and relative paths. Rejects
 * javascript:, data:, vbscript:, and other dangerous schemes.
 */
export function isSafeUrl(url: string | undefined): boolean {
  if (!url) return true;

  // Relative URLs are safe
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith("?")) {
    return true;
  }

  try {
    const parsed = new URL(url, "https://placeholder.invalid");
    return SAFE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}
