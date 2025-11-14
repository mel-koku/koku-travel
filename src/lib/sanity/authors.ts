import { unstable_cache } from "next/cache";

import { sanityClient, getPreviewClient } from "./client";
import {
  ALL_AUTHORS_QUERY,
  AUTHOR_BY_SLUG_QUERY,
  GUIDES_BY_AUTHOR_QUERY,
} from "./queries";
import type { ExpertProfile } from "@/types/expert";
import type { Guide } from "@/types/guide";

type SanityAuthor = {
  _id: string;
  name?: string;
  slug?: string;
  bio?: string;
  experience?: string; // Deprecated field
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
  publishedAt?: string;
  _updatedAt?: string;
  author?: (SanityAuthor & { experience?: string }) | null;
};

function mapGuideFromAuthor(doc: SanityGuide): Guide | null {
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
    experience: doc.author?.bio?.trim() || doc.author?.experience?.trim(),
    lastUpdated: doc.publishedAt ?? doc._updatedAt ?? null,
  };
}

function mapGuidesFromAuthor(docs: SanityGuide[]): Guide[] {
  return docs.map(mapGuideFromAuthor).filter((guide): guide is Guide => Boolean(guide));
}

function mapAuthor(doc: SanityAuthor): ExpertProfile | null {
  const slug = doc.slug?.trim();
  const name = doc.name?.trim();
  // Use bio if available, fall back to deprecated 'experience' field
  const bio = doc.bio?.trim() || doc.experience?.trim();

  if (!slug || !name || !bio) {
    return null;
  }

  return {
    id: slug,
    name,
    bio,
    expertise: Array.isArray(doc.expertise)
      ? doc.expertise.filter((value): value is string => typeof value === "string")
      : [],
    languages: Array.isArray(doc.languages)
      ? doc.languages.filter((value): value is string => typeof value === "string")
      : [],
    avatar: doc.avatar ?? undefined,
    coverImage: doc.coverImage ?? undefined,
    location: doc.location?.trim() ?? undefined,
    yearsExperience: doc.yearsExperience ?? undefined,
    guides: [],
    itineraries: [],
  };
}

function mapAuthors(docs: SanityAuthor[]): ExpertProfile[] {
  return docs.map(mapAuthor).filter((author): author is ExpertProfile => Boolean(author));
}

type FetchAuthorsOptions = {
  preview?: boolean;
  token?: string;
};

function selectClient({ preview, token }: FetchAuthorsOptions = {}) {
  if (preview) {
    return getPreviewClient(token);
  }
  return sanityClient;
}

const fetchPublishedAuthors = unstable_cache(
  async () => {
    const results = await sanityClient.fetch<SanityAuthor[]>(ALL_AUTHORS_QUERY);
    return mapAuthors(results);
  },
  ["authors"],
  { tags: ["authors"] },
);

export async function fetchAuthors(
  options?: FetchAuthorsOptions,
): Promise<ExpertProfile[]> {
  if (options?.preview) {
    const client = selectClient(options);
    try {
      const results = await client.fetch<SanityAuthor[]>(ALL_AUTHORS_QUERY);
      return mapAuthors(results);
    } catch (error) {
      console.error("[authors] Failed to fetch preview authors:", error);
      return [];
    }
  }

  try {
    const cached = await fetchPublishedAuthors();
    if (cached.length > 0) {
      return cached;
    }
  } catch (error) {
    console.error("[authors] Failed to read cached authors:", error);
  }

  try {
    const fresh = await sanityClient.fetch<SanityAuthor[]>(ALL_AUTHORS_QUERY);
    const mapped = mapAuthors(fresh);
    if (mapped.length > 0) {
      return mapped;
    }
  } catch (error) {
    console.error("[authors] Failed to fetch authors from Sanity:", error);
  }

  return [];
}

export async function fetchAuthorBySlug(
  slug: string,
  options?: FetchAuthorsOptions & { includeGuides?: boolean },
): Promise<ExpertProfile | null> {
  const normalizedSlug = slug?.trim();
  if (!normalizedSlug) {
    return null;
  }

  const client = selectClient(options);

  try {
    const author = await client.fetch<SanityAuthor | null>(AUTHOR_BY_SLUG_QUERY, {
      slug: normalizedSlug,
    });

    if (!author) {
      return null;
    }

    const mappedAuthor = mapAuthor(author);
    if (!mappedAuthor) {
      return null;
    }

    // Optionally fetch guides for this author
    if (options?.includeGuides) {
      try {
        const guides = await client.fetch<SanityGuide[]>(
          GUIDES_BY_AUTHOR_QUERY,
          { authorId: author._id },
        );
        mappedAuthor.guides = mapGuidesFromAuthor(guides || []);
      } catch (error) {
        console.error("[authors] Failed to fetch guides for author:", error);
      }
    }

    return mappedAuthor;
  } catch (error) {
    console.error("[authors] Failed to fetch author:", error);
    return null;
  }
}

