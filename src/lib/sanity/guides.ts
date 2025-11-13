import { unstable_cache } from "next/cache";

import { sanityClient, getPreviewClient } from "./client";
import { ALL_GUIDES_QUERY, GUIDE_BY_SLUG_QUERY } from "./queries";
import type { Guide } from "@/types/guide";

const FALLBACK_GUIDES: Guide[] = [
  {
    id: "kyoto-culture",
    slug: "kyoto-culture",
    name: "Mika Tanaka",
    title: "A Day in Kyoto’s Temples",
    category: "culture",
    categories: ["culture"],
    summary: "Discover Kyoto’s timeless shrines, tranquil gardens, and street eats.",
    image: "https://images.pexels.com/photos/2342479/pexels-photo-2342479.jpeg",
    languages: ["English", "Japanese"],
    featured: true,
    experience: "Tea ceremony host and licensed Kyoto guide with a focus on temples and heritage craft.",
    lastUpdated: null,
  },
  {
    id: "tokyo-nightlife",
    slug: "tokyo-nightlife",
    name: "Kenji Sato",
    title: "Tokyo After Dark",
    category: "nightlife",
    categories: ["nightlife"],
    summary: "Explore bars, izakayas, and skyline views in Japan’s sleepless city.",
    image: "https://cdn.pixabay.com/photo/2021/12/17/10/09/night-6876155_1280.jpg",
    languages: ["English", "Japanese"],
    featured: false,
    experience: "Former bartender curating small-group nightlife crawls across Shibuya and Shinjuku.",
    lastUpdated: null,
  },
  {
    id: "hokkaido-food",
    slug: "hokkaido-food",
    name: "Aya Nakamura",
    title: "Hokkaido for Food Lovers",
    category: "food",
    categories: ["food"],
    summary: "From soup curry to fresh uni — a culinary trail through the north.",
    image: "https://cdn.pixabay.com/photo/2020/04/12/13/03/ramen-5034166_1280.jpg",
    languages: ["English", "Japanese", "Mandarin"],
    featured: false,
    experience: "Food writer and ramen tour host covering Sapporo’s seasonal specialties.",
    lastUpdated: null,
  },
];

type SanityGuide = {
  _id: string;
  name?: string;
  headline?: string;
  summary?: string;
  categories?: string[];
  languages?: string[];
  featured?: boolean;
  experience?: string;
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
};

function mapGuide(doc: SanityGuide): Guide | null {
  const slug = doc.slug?.trim();
  const title = doc.headline?.trim() || doc.name?.trim();
  const summary = doc.summary?.trim() ?? "";
  const image = doc.image ?? "";

  if (!slug || !title || !image) {
    return null;
  }

  const categories = Array.isArray(doc.categories)
    ? doc.categories.filter((value): value is string => typeof value === "string")
    : [];

  return {
    id: slug,
    slug,
    title,
    name: doc.name?.trim() ?? title,
    summary,
    image,
    category: categories[0] ?? "general",
    categories,
    languages: Array.isArray(doc.languages) ? doc.languages : [],
    featured: Boolean(doc.featured),
    experience: doc.experience?.trim(),
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
  if (options?.preview) {
    const client = selectClient(options);
    const results = await client.fetch<SanityGuide[]>(ALL_GUIDES_QUERY);
    return mapGuides(results);
  }

  try {
    const cached = await fetchPublishedGuides();
    if (cached.length > 0) {
      return cached;
    }
  } catch (error) {
    console.error("[guides] Failed to read cached guides:", error);
  }

  try {
    const fresh = await sanityClient.fetch<SanityGuide[]>(ALL_GUIDES_QUERY);
    const mapped = mapGuides(fresh);
    if (mapped.length > 0) {
      return mapped;
    }
  } catch (error) {
    console.error("[guides] Failed to fetch guides from Sanity:", error);
  }

  return FALLBACK_GUIDES;
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
      console.error("[guides] Failed to fetch preview guide:", error);
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
    console.error("[guides] Failed to read cached guide:", error);
  }

  try {
    const doc = await sanityClient.fetch<SanityGuide | null>(GUIDE_BY_SLUG_QUERY, {
      slug: normalizedSlug,
    });
    if (!doc) {
      return (
        FALLBACK_GUIDES.find((fallbackGuide) => fallbackGuide.slug === normalizedSlug) ?? null
      );
    }

    const mapped = mapGuide(doc);
    if (mapped) {
      return mapped;
    }
  } catch (error) {
    console.error("[guides] Failed to fetch guide from Sanity:", error);
  }

  return FALLBACK_GUIDES.find((fallbackGuide) => fallbackGuide.slug === normalizedSlug) ?? null;
}

