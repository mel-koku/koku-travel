import { unstable_cache } from "next/cache";

import { sanityClient, getPreviewClient } from "./client";
import { ALL_GUIDES_QUERY, GUIDE_BY_SLUG_QUERY } from "./queries";
import type { Guide } from "@/types/guide";
import { logger } from "@/lib/logger";

type SanityAuthor = {
  _id: string;
  name?: string;
  slug?: string;
  bio?: string;
  expertise?: string[];
  languages?: string[];
  avatar?: string;
  coverImage?: string;
  location?: string;
  yearsExperience?: number;
};

type SanityGuide = {
  _id: string;
  title?: string;
  headline?: string;
  summary?: string;
  categories?: string[];
  location?: string;
  featured?: boolean;
  slug?: string;
  image?: string;
  imageMeta?: {
    dimensions?: {
      width?: number;
      height?: number;
    };
  };
  publishedAt?: string;
  _updatedAt?: string;
  author?: SanityAuthor | null;
};

function mapGuide(doc: SanityGuide): Guide | null {
  const slug = doc.slug?.trim();
  const title = doc.title?.trim() || doc.headline?.trim();
  const summary = doc.summary?.trim() ?? "";
  const image = doc.image ?? "";
  const authorName = doc.author?.name?.trim();

  if (!slug || !title || !image || !authorName) {
    return null;
  }

  const categories = Array.isArray(doc.categories)
    ? doc.categories.filter((value): value is string => typeof value === "string")
    : [];

  return {
    id: slug,
    slug,
    title,
    name: authorName,
    summary,
    image,
    category: categories[0] ?? "general",
    categories,
    location: doc.location?.trim() ?? "tokyo",
    languages: Array.isArray(doc.author?.languages) ? doc.author.languages : [],
    featured: Boolean(doc.featured),
    experience: doc.author?.bio?.trim(),
    lastUpdated: doc.publishedAt ?? doc._updatedAt ?? null,
  };
}

function mapGuides(docs: SanityGuide[]): Guide[] {
  return docs.map(mapGuide).filter((guide): guide is Guide => Boolean(guide));
}

type FetchGuidesOptions = {
  preview?: boolean;
  token?: string;
};

function selectClient({ preview, token }: FetchGuidesOptions = {}) {
  if (preview) {
    return getPreviewClient(token);
  }
  return sanityClient;
}

const fetchPublishedGuides = unstable_cache(
  async () => {
    const results = await sanityClient.fetch<SanityGuide[]>(ALL_GUIDES_QUERY);
    return mapGuides(results);
  },
  ["guides"],
  { tags: ["guides"] },
);

export async function fetchGuides(options?: FetchGuidesOptions): Promise<Guide[]> {
  let sanityGuides: Guide[] = [];

  if (options?.preview) {
    const client = selectClient(options);
    try {
      const results = await client.fetch<SanityGuide[]>(ALL_GUIDES_QUERY);
      sanityGuides = mapGuides(results);
      logger.debug(`Fetched ${sanityGuides.length} preview guide(s) from Sanity`);
    } catch (error) {
      logger.error("Failed to fetch preview guides", error);
    }
  } else {
    // In development, always fetch fresh data to avoid stale cache issues
    if (process.env.NODE_ENV === "development") {
      try {
        const fresh = await sanityClient.fetch<SanityGuide[]>(ALL_GUIDES_QUERY);
        const mapped = mapGuides(fresh);
        logger.debug(`Fetched ${fresh.length} raw guide(s), ${mapped.length} valid guide(s) from Sanity`);
        sanityGuides = mapped;
      } catch (error) {
        logger.error("Failed to fetch guides from Sanity", error);
      }
    } else {
      // In production, try cache first, then fallback to fresh fetch
      try {
        const cached = await fetchPublishedGuides();
        if (cached.length > 0) {
          sanityGuides = cached;
          logger.debug(`Using ${sanityGuides.length} cached guide(s)`);
        } else {
          logger.debug("Cache is empty, fetching fresh data...");
        }
      } catch (error) {
        logger.error("Failed to read cached guides", error);
      }

      // Fetch fresh data if cache is empty
      if (sanityGuides.length === 0) {
        try {
          const fresh = await sanityClient.fetch<SanityGuide[]>(ALL_GUIDES_QUERY);
          const mapped = mapGuides(fresh);
          logger.debug(`Fetched ${fresh.length} raw guide(s), ${mapped.length} valid guide(s) from Sanity`);
          if (mapped.length > 0) {
            sanityGuides = mapped;
          }
        } catch (error) {
          logger.error("Failed to fetch guides from Sanity", error);
        }
      }
    }
  }

  logger.debug(`Returning ${sanityGuides.length} guide(s) total`);
  return sanityGuides;
}

export async function fetchGuideBySlug(
  slug: string,
  options?: FetchGuidesOptions,
): Promise<Guide | null> {
  const normalizedSlug = slug?.trim();
  if (!normalizedSlug) {
    return null;
  }

  if (options?.preview) {
    const client = selectClient(options);
    try {
      const doc = await client.fetch<SanityGuide | null>(GUIDE_BY_SLUG_QUERY, {
        slug: normalizedSlug,
      });
      if (!doc) return null;
      return mapGuide(doc);
    } catch (error) {
      logger.error("Failed to fetch preview guide", error);
      return null;
    }
  }

  try {
    const guides = await fetchPublishedGuides();
    const guide = guides.find((entry) => entry.slug === normalizedSlug);
    if (guide) {
      return guide;
    }
  } catch (error) {
    logger.error("Failed to read cached guide", error);
  }

  try {
    const doc = await sanityClient.fetch<SanityGuide | null>(GUIDE_BY_SLUG_QUERY, {
      slug: normalizedSlug,
    });
    if (!doc) {
      return null;
    }

    return mapGuide(doc);
  } catch (error) {
    logger.error("Failed to fetch guide from Sanity", error);
    return null;
  }
}

