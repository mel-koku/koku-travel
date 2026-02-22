/**
 * Server-side guide service for fetching guides from the database
 *
 * Provides functions to query AI-generated travel guides stored in Supabase.
 */

import { createClient } from "@/lib/supabase/server";
import type { Guide, GuideRow, GuideSummary } from "@/types/guide";
import { rowToGuide } from "@/types/guide";
import { fetchLocationsByIds } from "@/lib/locations/locationService";
import type { Location } from "@/types/location";
import { sanityClient } from "@/sanity/client";
import { guideBySlugQuery, authorBySlugQuery, allAuthorsQuery } from "@/sanity/queries";
import type { SanityGuide, SanityAuthorFull, SanityAuthorSummary } from "@/types/sanityGuide";

/**
 * Columns for full guide fetch
 */
const GUIDE_FULL_COLUMNS = `
  id,
  title,
  subtitle,
  summary,
  body,
  featured_image,
  thumbnail_image,
  guide_type,
  seasons,
  tags,
  city,
  region,
  location_ids,
  reading_time_minutes,
  author,
  status,
  featured,
  sort_order,
  created_at,
  updated_at,
  published_at
`;

/**
 * Columns for guide list/summary fetch (lighter payload)
 */
const GUIDE_SUMMARY_COLUMNS = `
  id,
  title,
  subtitle,
  summary,
  featured_image,
  thumbnail_image,
  guide_type,
  seasons,
  city,
  region,
  reading_time_minutes,
  tags
`;

/**
 * Fetches all published guides for the list page.
 *
 * @returns Array of guide summaries sorted by sort_order and published_at
 */
export async function getPublishedGuides(): Promise<GuideSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guides")
    .select(GUIDE_SUMMARY_COLUMNS)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    summary: row.summary,
    featuredImage: row.featured_image,
    thumbnailImage: row.thumbnail_image ?? undefined,
    guideType: row.guide_type,
    seasons: row.seasons ?? undefined,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    readingTimeMinutes: row.reading_time_minutes ?? undefined,
    tags: row.tags,
  }));
}

/**
 * Fetches a single guide by its slug ID.
 *
 * @param slug - The guide's slug-based ID
 * @returns The full guide or null if not found/not published
 */
export async function getGuideBySlug(slug: string): Promise<Guide | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guides")
    .select(GUIDE_FULL_COLUMNS)
    .eq("id", slug)
    .eq("status", "published")
    .single();

  if (error || !data) {
    return null;
  }

  return rowToGuide(data as GuideRow);
}

/**
 * Fetches featured guides for homepage display.
 *
 * @param limit - Maximum number of guides to return (default: 3)
 * @returns Array of featured guide summaries
 */
export async function getFeaturedGuides(limit: number = 3): Promise<GuideSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guides")
    .select(GUIDE_SUMMARY_COLUMNS)
    .eq("status", "published")
    .eq("featured", true)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    summary: row.summary,
    featuredImage: row.featured_image,
    thumbnailImage: row.thumbnail_image ?? undefined,
    guideType: row.guide_type,
    seasons: row.seasons ?? undefined,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    readingTimeMinutes: row.reading_time_minutes ?? undefined,
    tags: row.tags,
  }));
}

/**
 * Fetches a guide with its linked locations for the detail page.
 *
 * @param slug - The guide's slug-based ID
 * @returns Object with guide and linked locations, or null if not found
 */
export async function getGuideWithLocations(
  slug: string
): Promise<{ guide: Guide; locations: Location[] } | null> {
  const guide = await getGuideBySlug(slug);

  if (!guide) {
    return null;
  }

  const locations = await fetchLocationsByIds(guide.locationIds);

  return { guide, locations };
}

/**
 * Fetches guides by city for related content.
 *
 * @param city - City name to filter by
 * @param excludeId - Guide ID to exclude (current guide)
 * @param limit - Maximum number of guides to return
 * @returns Array of guide summaries
 */
export async function getGuidesByCity(
  city: string,
  excludeId?: string,
  limit: number = 4
): Promise<GuideSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from("guides")
    .select(GUIDE_SUMMARY_COLUMNS)
    .eq("status", "published")
    .ilike("city", city);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    summary: row.summary,
    featuredImage: row.featured_image,
    thumbnailImage: row.thumbnail_image ?? undefined,
    guideType: row.guide_type,
    seasons: row.seasons ?? undefined,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    readingTimeMinutes: row.reading_time_minutes ?? undefined,
    tags: row.tags,
  }));
}

/**
 * Fetches guides by type.
 *
 * @param guideType - Type of guide to filter by
 * @param excludeId - Guide ID to exclude (current guide)
 * @param limit - Maximum number of guides to return
 * @returns Array of guide summaries
 */
export async function getGuidesByType(
  guideType: Guide["guideType"],
  excludeId?: string,
  limit: number = 10
): Promise<GuideSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from("guides")
    .select(GUIDE_SUMMARY_COLUMNS)
    .eq("status", "published")
    .eq("guide_type", guideType);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    summary: row.summary,
    featuredImage: row.featured_image,
    thumbnailImage: row.thumbnail_image ?? undefined,
    guideType: row.guide_type,
    seasons: row.seasons ?? undefined,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    readingTimeMinutes: row.reading_time_minutes ?? undefined,
    tags: row.tags,
  }));
}

/**
 * Fetches guides matching a season.
 * Matches guides with the given season in their `seasons` array,
 * OR guides with guide_type "seasonal" (legacy).
 */
export async function getGuidesBySeason(
  season: string,
  limit: number = 6
): Promise<GuideSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guides")
    .select(GUIDE_SUMMARY_COLUMNS)
    .eq("status", "published")
    .or(`seasons.cs.{${season}},guide_type.eq.seasonal`)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    summary: row.summary,
    featuredImage: row.featured_image,
    thumbnailImage: row.thumbnail_image ?? undefined,
    guideType: row.guide_type,
    seasons: row.seasons ?? undefined,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    readingTimeMinutes: row.reading_time_minutes ?? undefined,
    tags: row.tags,
  }));
}

// ---------------------------------------------------------------------------
// Sanity CDN fetchers
// ---------------------------------------------------------------------------

/**
 * Fetches a guide from Sanity by slug (CDN-cached).
 * Returns null if the Sanity project is unavailable.
 */
export async function getSanityGuideBySlug(
  slug: string
): Promise<SanityGuide | null> {
  try {
    const result = await sanityClient.fetch<SanityGuide | null>(
      guideBySlugQuery,
      { slug }
    );
    return result;
  } catch {
    return null;
  }
}

/**
 * Fetches a Sanity guide with its linked locations from Supabase.
 */
export async function getSanityGuideWithLocations(
  slug: string
): Promise<{ guide: SanityGuide; locations: Location[] } | null> {
  const guide = await getSanityGuideBySlug(slug);
  if (!guide) return null;

  const locations = guide.locationIds?.length
    ? await fetchLocationsByIds(guide.locationIds)
    : [];

  return { guide, locations };
}

/**
 * Fetches an author profile from Sanity with their published guides.
 * Returns null if the Sanity project is unavailable.
 */
export async function getSanityAuthorBySlug(
  slug: string
): Promise<SanityAuthorFull | null> {
  try {
    const result = await sanityClient.fetch<SanityAuthorFull | null>(
      authorBySlugQuery,
      { slug }
    );
    return result;
  } catch {
    return null;
  }
}

/**
 * Fetches all authors from Sanity for the directory page.
 * Returns empty array if the Sanity project is unavailable.
 */
export async function getAllSanityAuthors(): Promise<SanityAuthorSummary[]> {
  try {
    const result = await sanityClient.fetch<SanityAuthorSummary[]>(
      allAuthorsQuery
    );
    return result || [];
  } catch {
    return [];
  }
}
