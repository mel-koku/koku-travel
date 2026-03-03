export type ExperienceType =
  | "workshop"
  | "cruise"
  | "tour"
  | "experience"
  | "adventure"
  | "rental";

export type Difficulty = "easy" | "moderate" | "challenging";

export type ExperienceSummary = {
  _id: string;
  title: string;
  slug: string;
  subtitle?: string;
  summary: string;
  featuredImage: { url?: string };
  thumbnailImage?: { url?: string };
  experienceType: ExperienceType;
  duration?: string;
  difficulty?: Difficulty;
  estimatedCost?: string;
  city?: string;
  region?: string;
  locationIds?: string[];
  readingTimeMinutes?: number;
  tags?: string[];
  craftType?: string;
  publishedAt?: string;
};

/**
 * Row shape from the Supabase `experiences` table.
 * Used by /api/experiences/all and mapped to Location shape at the hook level.
 */
export type SupabaseExperience = {
  id: string;
  name: string;
  region: string | null;
  city: string | null;
  prefecture: string | null;
  experience_type: string | null;
  image: string | null;
  short_description: string | null;
  summary: string | null;
  estimated_duration: string | null;
  rating: number | null;
  review_count: number | null;
  coordinates: { lat: number; lng: number } | null;
  primary_photo_url: string | null;
  craft_type: string | null;
  tags: string[] | null;
  sanity_slug: string | null;
  has_editorial: boolean | null;
  difficulty: string | null;
  best_season: string[] | null;
  booking_url: string | null;
  meeting_point: string | null;
  is_hidden_gem: boolean | null;
  insider_tip: string | null;
  operating_hours: Record<string, unknown> | null;
  name_japanese: string | null;
  nearest_station: string | null;
  price_level: number | null;
};
