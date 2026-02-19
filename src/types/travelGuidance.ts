/**
 * Types of travel guidance content.
 * - etiquette: Cultural customs and respectful behavior
 * - practical: How-to tips and logistics
 * - environmental: Sustainability and responsible tourism
 * - seasonal: Time-specific or weather-related tips
 * - accessibility: Mobility, disability, and special needs
 * - photography: Photo tips, etiquette, and best spots
 * - budget: Money-saving strategies and cost tips
 * - nightlife: After-dark activities and entertainment
 * - family: Kid-friendly tips and family travel
 * - solo: Solo traveler advice and safety
 * - food_culture: Food customs, specialties, and dining etiquette
 * - cultural_context: Deeper cultural background and context
 */
export type GuidanceType =
  | "etiquette"
  | "practical"
  | "environmental"
  | "seasonal"
  | "accessibility"
  | "photography"
  | "budget"
  | "nightlife"
  | "family"
  | "solo"
  | "food_culture"
  | "cultural_context";

/**
 * Status of travel guidance content.
 */
export type GuidanceStatus = "draft" | "published" | "archived";

/**
 * Seasons for seasonal-specific tips.
 */
export type Season = "spring" | "summer" | "fall" | "winter";

/**
 * Travel guidance content for responsible/respectful travel tips.
 * Matches tips to activities based on categories, regions, cities, and tags.
 */
export type TravelGuidance = {
  id: string;

  // Content
  /** Short, actionable title for the tip */
  title: string;
  /** Brief summary (max 200 chars) displayed inline on activity cards */
  summary: string;
  /** Full detailed content for expanded/detail views */
  content?: string;
  /** Emoji or Lucide icon name */
  icon?: string;

  // Categorization
  /** Type of guidance */
  guidanceType: GuidanceType;
  /** Keywords for matching and search */
  tags: string[];

  // Matching criteria
  /** Location categories this applies to (e.g., 'temple', 'shrine', 'restaurant') */
  categories: string[];
  /** Region-specific tips */
  regions: string[];
  /** City-specific tips (lowercase for matching) */
  cities: string[];
  /** Specific location IDs this applies to */
  locationIds: string[];
  /** Seasons when this tip applies */
  seasons: Season[];

  // Targeting
  /** If true, applies to all activities regardless of matching criteria */
  isUniversal: boolean;
  /** Display priority 1-10, higher = more important */
  priority: number;

  // Attribution
  /** Name of the source (e.g., "JNTO", "Japan-Guide.com") */
  sourceName?: string;
  /** URL of the source for attribution */
  sourceUrl?: string;

  // Management
  status: GuidanceStatus;
  createdAt: string;
  updatedAt: string;
};

/**
 * Database row type (snake_case) for Supabase queries.
 */
export type TravelGuidanceRow = {
  id: string;
  title: string;
  summary: string;
  content: string | null;
  icon: string | null;
  guidance_type: GuidanceType;
  tags: string[];
  categories: string[];
  regions: string[];
  cities: string[];
  location_ids: string[];
  seasons: string[];
  is_universal: boolean;
  priority: number;
  source_name: string | null;
  source_url: string | null;
  status: GuidanceStatus;
  created_at: string;
  updated_at: string;
};

/**
 * Convert database row to application type.
 */
export function rowToTravelGuidance(row: TravelGuidanceRow): TravelGuidance {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content ?? undefined,
    icon: row.icon ?? undefined,
    guidanceType: row.guidance_type,
    tags: row.tags,
    categories: row.categories,
    regions: row.regions,
    cities: row.cities,
    locationIds: row.location_ids,
    seasons: row.seasons as Season[],
    isUniversal: row.is_universal,
    priority: row.priority,
    sourceName: row.source_name ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Input for creating new travel guidance (extracted from URLs).
 */
export type TravelGuidanceInput = Omit<TravelGuidance, "id" | "status" | "createdAt" | "updatedAt">;
