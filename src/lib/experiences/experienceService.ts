import { sanityClient } from "@/sanity/client";
import {
  experienceBySlugQuery,
  allPublishedExperiencesQuery,
  featuredExperiencesQuery,
} from "@/sanity/queries";
import type { SanityExperience } from "@/types/sanityExperience";
import type { ExperienceSummary, ExperienceType } from "@/types/experience";

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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
    return [];
  }
}
