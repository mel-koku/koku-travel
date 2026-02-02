/**
 * Types of travel guides.
 * - itinerary: Day-by-day travel plans
 * - listicle: Numbered lists (e.g., "3 Things to Do in...")
 * - deep_dive: In-depth coverage of a topic
 * - seasonal: Time-specific content (cherry blossoms, autumn leaves)
 */
export type GuideType = "itinerary" | "listicle" | "deep_dive" | "seasonal";

/**
 * Guide publication status.
 */
export type GuideStatus = "draft" | "published" | "archived";

/**
 * Travel guide content for Japan travel.
 * Used for AI-generated articles and curated content.
 */
export type Guide = {
  /** Slug-based ID for SEO-friendly URLs */
  id: string;

  // Content
  title: string;
  subtitle?: string;
  /** Short summary for cards (max 200 chars) */
  summary: string;
  /** Full markdown body content */
  body: string;
  /** Hero image URL */
  featuredImage: string;
  /** Optional thumbnail for cards (falls back to featuredImage) */
  thumbnailImage?: string;

  // Categorization
  guideType: GuideType;
  tags: string[];

  // Location linking
  /** Primary city (lowercase for matching) */
  city?: string;
  /** Primary region */
  region?: string;
  /** Linked location IDs from locations table */
  locationIds: string[];

  // Metadata
  readingTimeMinutes?: number;
  author: string;

  // Publishing
  status: GuideStatus;
  /** Featured on homepage */
  featured: boolean;
  /** Manual sort order */
  sortOrder: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

/**
 * Database row type (snake_case) for Supabase queries.
 */
export type GuideRow = {
  id: string;
  title: string;
  subtitle: string | null;
  summary: string;
  body: string;
  featured_image: string;
  thumbnail_image: string | null;
  guide_type: GuideType;
  tags: string[];
  city: string | null;
  region: string | null;
  location_ids: string[];
  reading_time_minutes: number | null;
  author: string;
  status: GuideStatus;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

/**
 * Convert database row to application type.
 */
export function rowToGuide(row: GuideRow): Guide {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    summary: row.summary,
    body: row.body,
    featuredImage: row.featured_image,
    thumbnailImage: row.thumbnail_image ?? undefined,
    guideType: row.guide_type,
    tags: row.tags,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    locationIds: row.location_ids,
    readingTimeMinutes: row.reading_time_minutes ?? undefined,
    author: row.author,
    status: row.status,
    featured: row.featured,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  };
}

/**
 * Convert application type to database row for insert/update.
 */
export function guideToRow(guide: Omit<Guide, "createdAt" | "updatedAt">): Omit<GuideRow, "created_at" | "updated_at"> {
  return {
    id: guide.id,
    title: guide.title,
    subtitle: guide.subtitle ?? null,
    summary: guide.summary,
    body: guide.body,
    featured_image: guide.featuredImage,
    thumbnail_image: guide.thumbnailImage ?? null,
    guide_type: guide.guideType,
    tags: guide.tags,
    city: guide.city ?? null,
    region: guide.region ?? null,
    location_ids: guide.locationIds,
    reading_time_minutes: guide.readingTimeMinutes ?? null,
    author: guide.author,
    status: guide.status,
    featured: guide.featured,
    sort_order: guide.sortOrder,
    published_at: guide.publishedAt ?? null,
  };
}

/**
 * Input for creating new guides (from import scripts).
 */
export type GuideInput = Omit<Guide, "createdAt" | "updatedAt">;

/**
 * Summary type for list views (lighter than full Guide).
 */
export type GuideSummary = Pick<
  Guide,
  | "id"
  | "title"
  | "subtitle"
  | "summary"
  | "featuredImage"
  | "thumbnailImage"
  | "guideType"
  | "city"
  | "region"
  | "readingTimeMinutes"
  | "tags"
>;
