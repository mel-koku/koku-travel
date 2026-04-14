import { createClient } from "@/lib/supabase/server";
import type { GuideSummary } from "@/types/guide";
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

/**
 * Returns a map of location_id -> first harvested Google photo proxy URL.
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
    const { data, error } = await supabase
      .from("location_photos")
      .select("location_id, photo_name, sort_order")
      .in("location_id", ids)
      .eq("source", "google")
      .eq("moderation", "approved")
      .order("sort_order", { ascending: true });
    if (error || !data) {
      if (error) {
        logger.warn("[fallbackImages] location_photos query failed", {
          code: error.code,
        });
      }
      return map;
    }
    for (const row of data as Array<{ location_id: string; photo_name: string }>) {
      if (!map.has(row.location_id)) {
        map.set(row.location_id, buildProxyUrl(row.photo_name));
      }
    }
  } catch (error) {
    logger.warn("[fallbackImages] location_photos query threw", { error });
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

  const heroByLocation = await fetchHeroPhotosByLocationIds(
    Array.from(candidateIds)
  );
  if (heroByLocation.size === 0) return summaries;

  return summaries.map((s) => {
    const ids = locationIdsByGuide.get(s.id) ?? [];
    let url: string | undefined;
    for (const id of ids) {
      const candidate = heroByLocation.get(id);
      if (candidate) {
        url = candidate;
        break;
      }
    }
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
