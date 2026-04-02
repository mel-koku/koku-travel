import { sanityClient } from "@/sanity/client";
import {
  experienceBySlugQuery,
  allPublishedExperiencesQuery,
  featuredExperiencesQuery,
} from "@/sanity/queries";
import type { SanityExperience } from "@/types/sanityExperience";
import type { ExperienceSummary, ExperienceType } from "@/types/experience";
import { logger } from "@/lib/logger";

/**
 * Fetches an experience from Sanity by slug (CDN-cached).
 */
export async function getSanityExperienceBySlug(
  slug: string
): Promise<SanityExperience | null> {
  try {
    const result = await sanityClient.fetch<SanityExperience | null>(
      experienceBySlugQuery,
      { slug }
    );
    return result;
  } catch (error) {
    logger.warn("[experienceService] Failed to fetch experience by slug", { slug, error });
    return null;
  }
}

/**
 * Fetches all published experiences for the listing page.
 */
export async function getPublishedExperiences(): Promise<ExperienceSummary[]> {
  try {
    const result = await sanityClient.fetch<ExperienceSummary[]>(
      allPublishedExperiencesQuery
    );
    return result || [];
  } catch (error) {
    logger.warn("[experienceService] Failed to fetch published experiences", { error });
    return [];
  }
}

/**
 * Fetches featured experiences for the landing page.
 * Falls back to latest published if none are flagged featured.
 */
export async function getFeaturedExperiences(
  limit: number = 3
): Promise<ExperienceSummary[]> {
  try {
    const result = await sanityClient.fetch<ExperienceSummary[]>(
      featuredExperiencesQuery,
      { limit }
    );
    if (result && result.length > 0) return result;

    // Fallback: latest published experiences
    const fallback = await sanityClient.fetch<ExperienceSummary[]>(
      `*[_type == "experience" && editorialStatus == "published"] | order(publishedAt desc) [0...$limit] {
        _id,
        title,
        "slug": slug.current,
        summary,
        "featuredImage": featuredImage {
          ...,
          "url": asset->url
        },
        "thumbnailImage": thumbnailImage {
          ...,
          "url": asset->url
        },
        experienceType,
        duration,
        difficulty,
        estimatedCost,
        city,
        region,
        readingTimeMinutes,
        tags,
        publishedAt
      }`,
      { limit }
    );
    return fallback || [];
  } catch (error) {
    logger.warn("[experienceService] Failed to fetch featured experiences", { error });
    return [];
  }
}

/**
 * Fetches experiences matching a season via their bestSeason field in Sanity.
 */
export async function getExperiencesBySeason(
  season: string,
  limit: number = 3
): Promise<ExperienceSummary[]> {
  try {
    const result = await sanityClient.fetch<ExperienceSummary[]>(
      `*[_type == "experience" && editorialStatus == "published" && $season in bestSeason] | order(sortOrder asc, publishedAt desc) [0...$limit] {
        _id,
        title,
        "slug": slug.current,
        summary,
        "featuredImage": featuredImage {
          ...,
          "url": asset->url
        },
        "thumbnailImage": thumbnailImage {
          ...,
          "url": asset->url
        },
        experienceType,
        duration,
        difficulty,
        estimatedCost,
        city,
        region,
        readingTimeMinutes,
        tags,
        publishedAt
      }`,
      { season, limit }
    );
    return result || [];
  } catch (error) {
    logger.warn("[experienceService] Failed to fetch seasonal experiences", { error });
    return [];
  }
}

/**
 * Fetches all published workshop experiences, sorted by rank.
 */
export async function getWorkshopExperiences(): Promise<ExperienceSummary[]> {
  try {
    const result = await sanityClient.fetch<ExperienceSummary[]>(
      `*[_type == "experience" && editorialStatus == "published" && experienceType == "workshop"] | order(sortOrder asc, publishedAt desc) {
        _id,
        title,
        "slug": slug.current,
        summary,
        "featuredImage": featuredImage {
          ...,
          "url": asset->url
        },
        "thumbnailImage": thumbnailImage {
          ...,
          "url": asset->url
        },
        experienceType,
        duration,
        difficulty,
        estimatedCost,
        city,
        region,
        readingTimeMinutes,
        tags,
        craftType,
        publishedAt
      }`
    );
    return result || [];
  } catch (error) {
    logger.warn("[experienceService] Failed to fetch workshop experiences", { error });
    return [];
  }
}

/**
 * Fetches published workshop experiences filtered by craft type.
 */
export async function getWorkshopExperiencesByCraftType(
  craftType: string
): Promise<ExperienceSummary[]> {
  try {
    const result = await sanityClient.fetch<ExperienceSummary[]>(
      `*[_type == "experience" && editorialStatus == "published" && experienceType == "workshop" && craftType == $craftType] | order(sortOrder asc, publishedAt desc) {
        _id,
        title,
        "slug": slug.current,
        summary,
        "featuredImage": featuredImage {
          ...,
          "url": asset->url
        },
        "thumbnailImage": thumbnailImage {
          ...,
          "url": asset->url
        },
        experienceType,
        duration,
        difficulty,
        estimatedCost,
        city,
        region,
        readingTimeMinutes,
        tags,
        craftType,
        publishedAt
      }`,
      { craftType }
    );
    return result || [];
  } catch (error) {
    logger.warn("[experienceService] Failed to fetch workshops by craft type", { error });
    return [];
  }
}

/**
 * Fetches related experiences by type, excluding current.
 */
export async function getRelatedExperiences(
  experienceType: ExperienceType,
  excludeSlug: string,
  limit: number = 2
): Promise<ExperienceSummary[]> {
  try {
    const result = await sanityClient.fetch<ExperienceSummary[]>(
      `*[_type == "experience" && editorialStatus == "published" && experienceType == $experienceType && slug.current != $excludeSlug] | order(sortOrder asc, publishedAt desc) [0...$limit] {
        _id,
        title,
        "slug": slug.current,
        summary,
        "featuredImage": featuredImage {
          ...,
          "url": asset->url
        },
        experienceType,
        duration,
        difficulty,
        estimatedCost,
        city,
        region,
        readingTimeMinutes,
        tags,
        publishedAt
      }`,
      { experienceType, excludeSlug, limit }
    );
    return result || [];
  } catch (error) {
    logger.warn("[experienceService] Failed to fetch related experiences", { error });
    return [];
  }
}
