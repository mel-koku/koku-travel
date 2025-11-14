/**
 * Validates a photo name parameter from Google Places API.
 * Photo names follow the pattern: places/{place_id}/photos/{photo_reference}
 *
 * @param photoName - The photo name to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhotoName(photoName: string): boolean {
  if (!photoName || typeof photoName !== "string") {
    return false;
  }

  // Enforce maximum length to prevent DoS attacks
  if (photoName.length > 500) {
    return false;
  }

  // Photo names should match: places/{place_id}/photos/{photo_reference}
  // Place IDs are typically alphanumeric with underscores and hyphens
  // Photo references are typically long alphanumeric strings
  const photoNamePattern = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
  return photoNamePattern.test(photoName);
}

/**
 * Validates a location ID parameter.
 * Location IDs should be non-empty strings with reasonable length limits.
 *
 * @param id - The location ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidLocationId(id: string): boolean {
  if (!id || typeof id !== "string") {
    return false;
  }
  
  const trimmed = id.trim();
  
  // Enforce minimum and maximum length
  if (trimmed.length === 0 || trimmed.length > 255) {
    return false;
  }
  
  // Reject dangerous characters that could be used for injection attacks
  // Allow alphanumeric, hyphens, underscores, and dots
  const safePattern = /^[A-Za-z0-9._-]+$/;
  if (!safePattern.test(trimmed)) {
    return false;
  }
  
  // Additional check: reject strings that look like path traversal attempts
  if (trimmed.includes("..") || trimmed.includes("//")) {
    return false;
  }
  
  return true;
}

/**
 * Validates and parses a positive integer from a query parameter.
 *
 * @param value - The string value to parse
 * @param max - Optional maximum value
 * @param min - Optional minimum value (default: 1)
 * @returns The parsed integer or null if invalid
 */
export function parsePositiveInt(
  value: string | null,
  max?: number,
  min: number = 1,
): number | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  // Reject strings that are too long (potential DoS)
  if (value.length > 10) {
    return null;
  }

  // Ensure the string only contains digits
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < min) {
    return null;
  }

  if (max !== undefined && parsed > max) {
    return null;
  }

  return parsed;
}

/**
 * Validates array size to prevent DoS attacks from oversized arrays.
 *
 * @param array - The array to validate
 * @param maxLength - Maximum allowed length
 * @returns true if valid, false otherwise
 */
export function isValidArraySize<T>(array: T[], maxLength: number): boolean {
  if (!Array.isArray(array)) {
    return false;
  }
  return array.length >= 0 && array.length <= maxLength;
}

/**
 * Validates nested object depth to prevent deep nesting attacks.
 *
 * @param obj - The object to validate
 * @param maxDepth - Maximum allowed depth (default: 10)
 * @returns true if valid, false otherwise
 */
export function isValidObjectDepth(obj: unknown, maxDepth: number = 10): boolean {
  if (obj === null || typeof obj !== "object") {
    return true;
  }

  function checkDepth(current: unknown, depth: number): boolean {
    if (depth > maxDepth) {
      return false;
    }

    if (current === null || typeof current !== "object") {
      return true;
    }

    if (Array.isArray(current)) {
      return current.every((item) => checkDepth(item, depth + 1));
    }

    return Object.values(current).every((value) => checkDepth(value, depth + 1));
  }

  return checkDepth(obj, 0);
}

