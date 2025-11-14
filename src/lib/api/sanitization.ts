/**
 * Sanitization utilities to prevent injection attacks, path traversal, and open redirects
 */

/**
 * Sanitizes a path segment to prevent path traversal attacks.
 * Removes dangerous characters and normalizes the path.
 *
 * @param path - The path to sanitize
 * @returns Sanitized path or null if invalid
 */
export function sanitizePath(path: string): string | null {
  if (!path || typeof path !== "string") {
    return null;
  }

  // Remove leading/trailing whitespace
  const trimmed = path.trim();

  // Reject empty strings
  if (trimmed.length === 0) {
    return null;
  }

  // Reject paths that are too long (DoS prevention)
  if (trimmed.length > 500) {
    return null;
  }

  // Reject path traversal attempts
  if (trimmed.includes("..") || trimmed.includes("//") || trimmed.includes("\\")) {
    return null;
  }

  // Reject absolute paths
  if (trimmed.startsWith("/") && trimmed.length > 1) {
    // Allow single "/" but normalize multi-segment paths
    const segments = trimmed.split("/").filter((s) => s.length > 0);
    // Reject if any segment contains dangerous characters
    for (const segment of segments) {
      if (!/^[A-Za-z0-9._-]+$/.test(segment)) {
        return null;
      }
    }
    return "/" + segments.join("/");
  }

  // For relative paths, validate each segment
  const segments = trimmed.split("/").filter((s) => s.length > 0);
  for (const segment of segments) {
    if (!/^[A-Za-z0-9._-]+$/.test(segment)) {
      return null;
    }
  }

  return segments.join("/");
}

/**
 * Validates and sanitizes a URL to prevent open redirect attacks.
 * Only allows relative URLs or URLs from the same origin.
 *
 * @param url - The URL to validate
 * @param allowedOrigin - The allowed origin (default: current request origin)
 * @returns Sanitized URL or null if invalid/unsafe
 */
export function sanitizeRedirectUrl(url: string, allowedOrigin?: string): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const trimmed = url.trim();

  // Reject empty strings
  if (trimmed.length === 0) {
    return null;
  }

  // Reject URLs that are too long
  if (trimmed.length > 2048) {
    return null;
  }

  // Allow relative URLs (starting with /)
  if (trimmed.startsWith("/")) {
    // Validate it's a safe path
    const sanitized = sanitizePath(trimmed);
    return sanitized;
  }

  // Reject protocol-relative URLs (//example.com) - can be used for open redirect
  if (trimmed.startsWith("//")) {
    return null;
  }

  // Reject javascript:, data:, and other dangerous protocols
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:", "about:"];
  const lowerTrimmed = trimmed.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerTrimmed.startsWith(protocol)) {
      return null;
    }
  }

  // If it's an absolute URL, validate it matches allowed origin
  if (allowedOrigin) {
    try {
      const urlObj = new URL(trimmed);
      const allowedUrl = new URL(allowedOrigin);
      // Only allow same origin
      if (
        urlObj.protocol !== allowedUrl.protocol ||
        urlObj.hostname !== allowedUrl.hostname ||
        urlObj.port !== allowedUrl.port
      ) {
        return null;
      }
      // Sanitize the path portion
      return sanitizePath(urlObj.pathname) || null;
    } catch {
      // Invalid URL
      return null;
    }
  }

  // If no allowed origin specified, reject absolute URLs
  try {
    new URL(trimmed);
    return null; // Absolute URL but no origin check
  } catch {
    // Not a valid URL, treat as relative path
    return sanitizePath(trimmed);
  }
}

/**
 * Sanitizes a string to prevent injection attacks.
 * Removes or escapes dangerous characters.
 *
 * @param input - The string to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string or null if invalid
 */
export function sanitizeString(input: string, maxLength: number = 1000): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > maxLength) {
    return null;
  }

  // Remove null bytes and control characters (except newlines/tabs for some use cases)
  const cleaned = trimmed.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");

  return cleaned;
}

/**
 * Validates that a string contains only safe characters for IDs, slugs, etc.
 *
 * @param input - The string to validate
 * @param maxLength - Maximum allowed length
 * @returns true if safe, false otherwise
 */
export function isSafeIdentifier(input: string, maxLength: number = 255): boolean {
  if (!input || typeof input !== "string") {
    return false;
  }

  const trimmed = input.trim();

  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return false;
  }

  // Allow alphanumeric, hyphens, underscores, and dots
  return /^[A-Za-z0-9._-]+$/.test(trimmed);
}

