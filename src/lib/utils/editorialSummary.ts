/**
 * Editorial Summary Priority Utilities
 *
 * There are three sources of descriptive content for locations:
 *
 * 1. Google Places editorialSummary (Highest Priority)
 *    - Source: Google Places API
 *    - Quality: Professional, authoritative, up-to-date
 *    - Availability: Not all places have editorial summaries
 *
 * 2. shortDescription (Medium Priority)
 *    - Source: Claude-generated descriptions
 *    - Quality: Good quality, consistent format
 *    - Availability: Generated for most curated locations
 *
 * 3. description (Lowest Priority)
 *    - Source: Original database content
 *    - Quality: Variable - may be outdated or incomplete
 *    - Availability: Most locations have this
 *
 * Priority Order: editorialSummary > shortDescription > description
 */

import type { Location, LocationDetails } from "@/types/location";

/**
 * Gets the best available summary for a location using the priority chain:
 * Google editorialSummary > shortDescription > description
 *
 * @param location - The location object from the database
 * @param googleEditorialSummary - Optional editorial summary from Google Places API
 * @returns The best available summary, or undefined if none available
 */
export function getBestSummary(
  location: Location,
  googleEditorialSummary?: string | null,
): string | undefined {
  // Priority 1: Google Places editorial summary
  if (googleEditorialSummary?.trim()) {
    return googleEditorialSummary.trim();
  }

  // Priority 2: Claude-generated short description
  if (location.shortDescription?.trim()) {
    return location.shortDescription.trim();
  }

  // Priority 3: Original description
  if (location.description?.trim()) {
    return location.description.trim();
  }

  return undefined;
}

/**
 * Gets the best available summary from location details.
 *
 * @param details - Location details from Google Places API
 * @param location - The location object from the database
 * @returns The best available summary, or undefined if none available
 */
export function getBestSummaryFromDetails(
  details: LocationDetails | null | undefined,
  location: Location,
): string | undefined {
  return getBestSummary(location, details?.editorialSummary);
}

/**
 * Checks if a location has any summary content available.
 *
 * @param location - The location object
 * @param googleEditorialSummary - Optional Google editorial summary
 * @returns true if any summary source is available
 */
export function hasSummary(
  location: Location,
  googleEditorialSummary?: string | null,
): boolean {
  return getBestSummary(location, googleEditorialSummary) !== undefined;
}

/**
 * Gets the source of the best available summary.
 * Useful for debugging and analytics.
 *
 * @param location - The location object
 * @param googleEditorialSummary - Optional Google editorial summary
 * @returns The source name or undefined if no summary
 */
export function getSummarySource(
  location: Location,
  googleEditorialSummary?: string | null,
): "google" | "claude" | "original" | undefined {
  if (googleEditorialSummary?.trim()) {
    return "google";
  }
  if (location.shortDescription?.trim()) {
    return "claude";
  }
  if (location.description?.trim()) {
    return "original";
  }
  return undefined;
}
