import type { Location } from "@/types/location";
import { LOCATION_EDITORIAL_SUMMARIES } from "@/data/locationEditorialSummaries";
import { hashString } from "@/lib/utils/hashString";

const CATEGORY_DESCRIPTORS: Record<string, string> = {
  culture: "Historic cultural landmark",
  food: "Favorite spot for local flavors",
  nature: "Outdoor escape with scenic views",
  shopping: "Bustling shopping stop",
  view: "Panoramic viewpoint worth the stop",
  entertainment: "Fun activities and family outings",
};

export function getShortOverview(location: Location, cachedSummary: string | null): string {
  const trimmedCachedSummary = cachedSummary?.trim();
  if (trimmedCachedSummary) {
    return trimmedCachedSummary;
  }
  const editorialSummary = LOCATION_EDITORIAL_SUMMARIES[location.id]?.trim();
  if (editorialSummary) {
    return editorialSummary;
  }
  if (location.shortDescription && location.shortDescription.trim().length > 0) {
    return location.shortDescription.trim();
  }

  const descriptor =
    CATEGORY_DESCRIPTORS[location.category?.toLowerCase() ?? ""] ?? "Notable experience";
  const cityPiece = location.city ? ` in ${location.city}` : "";

  const details: string[] = [];
  if (location.minBudget) {
    details.push(`Budget ${location.minBudget}`);
  }
  if (location.estimatedDuration) {
    details.push(`Plan for ${location.estimatedDuration}`);
  }

  const detailsSentence = details.length > 0 ? ` ${details.join(" • ")}` : "";

  return `${descriptor}${cityPiece}.${detailsSentence || " Easily fits into most itineraries."}`;
}

export function getLocationRating(location: Location): number | null {
  const baseValue = Number.isFinite(location.rating)
    ? clamp(location.rating as number, 0, 5)
    : generateRatingFromId(location.id);

  return baseValue ? Math.round(baseValue * 10) / 10 : null;
}

export function getLocationReviewCount(location: Location): number | null {
  if (Number.isInteger(location.reviewCount) && (location.reviewCount as number) > 0) {
    return location.reviewCount as number;
  }
  return generateReviewCountFromId(location.id);
}

function generateRatingFromId(seed: string): number {
  const hash = hashString(seed);
  const rating = 3.9 + (hash % 18) / 20; // 3.9 - 4.8 range
  return clamp(rating, 0, 5);
}

function generateReviewCountFromId(seed: string): number {
  const hash = hashString(seed);
  return 120 + (hash % 780) + Math.floor(hash % 4) * 100;
}


function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export const numberFormatter = new Intl.NumberFormat("en-US");

/**
 * Strip nearby-station references from an editorial summary so they don't
 * duplicate the station pill and travel segment already rendered on the card.
 *
 * Removes, in order:
 *   1. The exact nearestStation substring (e.g. "Kitaoji Station (20 min walk)")
 *   2. Generic "<Name> Station (N min walk|drive|ride)" fragments
 *   3. Dangling sentence fragments caused by the removal (leading/trailing
 *      conjunctions, double spaces, orphaned punctuation).
 */
export function stripStationReferences(
  summary: string | null | undefined,
  nearestStation: string | null | undefined,
): string | null {
  if (!summary) return null;
  let out = summary;

  if (nearestStation) {
    const escaped = nearestStation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), "");
  }

  // Generic "<ProperName> Station (N min walk)" fragments. Requires
  // capitalized name words to avoid eating neighboring prose.
  out = out.replace(
    /(?:[A-ZŌŪĀĒĪ][\w'-]*(?:\s+[A-ZŌŪĀĒĪ][\w'-]*){0,2}\s+)?Station\b\s*(?:\([^)]*(?:min|minute)[^)]*\))?/g,
    "",
  );

  // Clean up: "near , nestled" → "nestled"; "Located near ," → ""
  out = out
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .replace(/\b(?:located|nestled|set|situated|sitting)\s+(?:just\s+)?(?:near|by|close to|beside)\s*[,.]/gi, "")
    .replace(/\b(?:near|close to|beside)\s*[,.]/gi, "")
    .replace(/^[\s,.;:—–-]+/, "")
    .replace(/\s+$/, "")
    .trim();

  return out.length > 0 ? out : null;
}

