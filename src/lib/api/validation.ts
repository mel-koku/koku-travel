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

  // Photo names should match: places/{place_id}/photos/{photo_reference}
  // Place IDs are typically alphanumeric with underscores and hyphens
  // Photo references are typically long alphanumeric strings
  const photoNamePattern = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
  return photoNamePattern.test(photoName);
}

/**
 * Validates a location ID parameter.
 * Location IDs should be non-empty strings.
 *
 * @param id - The location ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidLocationId(id: string): boolean {
  if (!id || typeof id !== "string") {
    return false;
  }
  // Location IDs should be non-empty and not contain dangerous characters
  return id.trim().length > 0 && id.length <= 255 && !/[<>"']/.test(id);
}

/**
 * Validates and parses a positive integer from a query parameter.
 *
 * @param value - The string value to parse
 * @param max - Optional maximum value
 * @returns The parsed integer or null if invalid
 */
export function parsePositiveInt(value: string | null, max?: number): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  if (max !== undefined && parsed > max) {
    return null;
  }

  return parsed;
}

