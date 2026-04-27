import { createClient } from "@/lib/supabase/server";
import type { Guide, GuideSummary } from "@/types/guide";
import type { Location } from "@/types/location";
import { logger } from "@/lib/logger";

const GENERIC_FALLBACK = "/images/fallback.jpg";

function isMissingImage(url: string | undefined | null): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (trimmed === "") return true;
  if (trimmed === GENERIC_FALLBACK) return true;
  return false;
}

function buildProxyUrl(photoName: string, maxWidthPx = 1200): string {
  return `/api/places/photo?photoName=${encodeURIComponent(photoName)}&maxWidthPx=${maxWidthPx}`;
}

// Curated rows store a direct URL (e.g. Wikimedia Commons) in `photo_name`;
// Google rows store an opaque ref that must be served via the proxy. Mirrors
// the same source-aware mapping in /api/locations/[id]/route.ts.
function photoUrlFromRow(source: string, photoName: string, maxWidthPx = 1200): string {
  return source === "curated" ? photoName : buildProxyUrl(photoName, maxWidthPx);
}

const PHOTO_SOURCES = ["google", "curated"] as const;

/**
 * Returns a map of location_id -> best available hero photo URL. Prefers
 * harvested `location_photos` rows (vetted + attributed), falls back to
 * the location's own `primary_photo_url` column when the gallery is empty.
 * Silently returns an empty map on error so callers never fail because of
 * photo enrichment hiccups.
 */
async function fetchHeroPhotosByLocationIds(
  ids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  try {
    const supabase = await createClient();
    const [photos, locations] = await Promise.all([
      supabase
        .from("location_photos")
        .select("location_id, source, photo_name, sort_order")
        .in("location_id", ids)
        .in("source", PHOTO_SOURCES)
        .eq("moderation", "approved")
        .order("sort_order", { ascending: true }),
      supabase
        .from("locations")
        .select("id, primary_photo_url")
        .in("id", ids),
    ]);
    if (photos.error) {
      logger.warn("[fallbackImages] location_photos query failed", {
        code: photos.error.code,
      });
    }
    for (const row of (photos.data ?? []) as Array<{
      location_id: string;
      source: string;
      photo_name: string;
    }>) {
      if (!map.has(row.location_id)) {
        map.set(row.location_id, photoUrlFromRow(row.source, row.photo_name));
      }
    }
    if (locations.error) {
      logger.warn("[fallbackImages] locations query failed", {
        code: locations.error.code,
      });
    }
    for (const row of (locations.data ?? []) as Array<{
      id: string;
      primary_photo_url: string | null;
    }>) {
      if (map.has(row.id)) continue;
      if (isMissingImage(row.primary_photo_url)) continue;
      map.set(row.id, row.primary_photo_url as string);
    }
  } catch (error) {
    logger.warn("[fallbackImages] hero photo lookup threw", { error });
  }
  return map;
}

/**
 * Returns all approved Google photos per location (sorted by sort_order)
 * plus a single-photo fallback from `locations.primary_photo_url`. Used by
 * the guide-card fallback to diversify images across guides that share the
 * same location set.
 */
async function fetchHeroPhotoListByLocationIds(
  ids: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (ids.length === 0) return map;
  try {
    const supabase = await createClient();
    const [photos, locations] = await Promise.all([
      supabase
        .from("location_photos")
        .select("location_id, source, photo_name, sort_order")
        .in("location_id", ids)
        .in("source", PHOTO_SOURCES)
        .eq("moderation", "approved")
        .order("sort_order", { ascending: true }),
      supabase
        .from("locations")
        .select("id, primary_photo_url")
        .in("id", ids),
    ]);
    if (photos.error) {
      logger.warn("[fallbackImages] location_photos query failed", {
        code: photos.error.code,
      });
    }
    for (const row of (photos.data ?? []) as Array<{
      location_id: string;
      source: string;
      photo_name: string;
    }>) {
      const list = map.get(row.location_id) ?? [];
      list.push(photoUrlFromRow(row.source, row.photo_name));
      map.set(row.location_id, list);
    }
    if (locations.error) {
      logger.warn("[fallbackImages] locations query failed", {
        code: locations.error.code,
      });
    }
    for (const row of (locations.data ?? []) as Array<{
      id: string;
      primary_photo_url: string | null;
    }>) {
      if (map.has(row.id)) continue;
      if (isMissingImage(row.primary_photo_url)) continue;
      map.set(row.id, [row.primary_photo_url as string]);
    }
  } catch (error) {
    logger.warn("[fallbackImages] hero photo list lookup threw", { error });
  }
  return map;
}

/**
 * Patches guide summaries that are missing a featured/thumbnail image by
 * substituting a photo from the guide's first linked location. Runs one
 * Supabase query covering all guides that need it.
 */
export async function attachLocationFallbackImages(
  summaries: GuideSummary[],
  locationIdsByGuide: Map<string, string[]>
): Promise<GuideSummary[]> {
  const needing = summaries.filter(
    (s) => isMissingImage(s.featuredImage) || isMissingImage(s.thumbnailImage)
  );
  if (needing.length === 0) return summaries;

  const candidateIds = new Set<string>();
  for (const s of needing) {
    for (const id of locationIdsByGuide.get(s.id) ?? []) candidateIds.add(id);
  }
  if (candidateIds.size === 0) return summaries;

  const photosByLocation = await fetchHeroPhotoListByLocationIds(
    Array.from(candidateIds)
  );
  if (photosByLocation.size === 0) return summaries;

  return summaries.map((s) => {
    const ids = locationIdsByGuide.get(s.id) ?? [];
    const url = pickLocationImage(s.id, ids, photosByLocation);
    if (!url) return s;
    return {
      ...s,
      featuredImage: isMissingImage(s.featuredImage) ? url : s.featuredImage,
      thumbnailImage: isMissingImage(s.thumbnailImage)
        ? url
        : s.thumbnailImage,
    };
  });
}

/**
 * Single-guide variant of {@link attachLocationFallbackImages}. Patches a
 * full {@link Guide} so the detail-page hero matches the listing card image
 * exactly (same deterministic hash → same picked photo).
 */
export async function attachGuideFallbackImage(guide: Guide): Promise<Guide> {
  const featMissing = isMissingImage(guide.featuredImage);
  const thumbMissing = isMissingImage(guide.thumbnailImage);
  if (!featMissing && !thumbMissing) return guide;
  if (!guide.locationIds || guide.locationIds.length === 0) return guide;

  const photosByLocation = await fetchHeroPhotoListByLocationIds(
    guide.locationIds
  );
  if (photosByLocation.size === 0) return guide;

  const url = pickLocationImage(guide.id, guide.locationIds, photosByLocation);
  if (!url) return guide;

  return {
    ...guide,
    featuredImage: featMissing ? url : guide.featuredImage,
    thumbnailImage: thumbMissing ? url : guide.thumbnailImage,
  };
}

/**
 * Deterministically pick an image from a guide's linked locations. The guide
 * id is hashed twice — once to choose a starting location, once to choose a
 * photo within that location — so guides sharing location sets still surface
 * different photos. Falls back to sequential lookup when the preferred index
 * has no photo.
 */
function pickLocationImage(
  guideId: string,
  locationIds: string[],
  photosByLocation: Map<string, string[]>
): string | undefined {
  if (locationIds.length === 0) return undefined;
  const locStart = hashString(guideId + ":loc") % locationIds.length;
  const photoSeed = hashString(guideId + ":photo");
  for (let offset = 0; offset < locationIds.length; offset++) {
    const idx = (locStart + offset) % locationIds.length;
    const photos = photosByLocation.get(locationIds[idx]!);
    if (photos && photos.length > 0) {
      return photos[photoSeed % photos.length]!;
    }
  }
  return undefined;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Patches Location objects so the hero image prefers a harvested
 * `location_photos` entry over a potentially stale `primary_photo_url`.
 * Mirrors the policy used by `/api/locations/[id]`.
 */
export async function patchLocationHeroPhotos(
  locations: Location[]
): Promise<Location[]> {
  if (locations.length === 0) return locations;
  const heroByLocation = await fetchHeroPhotosByLocationIds(
    locations.map((l) => l.id)
  );
  if (heroByLocation.size === 0) return locations;
  return locations.map((l) => {
    const url = heroByLocation.get(l.id);
    if (!url) return l;
    return { ...l, primaryPhotoUrl: url };
  });
}
