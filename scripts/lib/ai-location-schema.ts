/**
 * Zod schema for validating AI-generated location JSON
 *
 * Used by the import-ai-locations script to validate data
 * discovered by Claude via web search before database insertion.
 */

import { z } from "zod";

// Valid regions in Japan
export const VALID_REGIONS = [
  "Hokkaido",
  "Tohoku",
  "Kanto",
  "Chubu",
  "Kansai",
  "Chugoku",
  "Shikoku",
  "Kyushu",
  "Okinawa",
] as const;

// Valid categories (will be normalized)
export const VALID_CATEGORIES = [
  "culture",
  "nature",
  "food",
  "shopping",
  "attraction",
  "hotel",
] as const;

// Coordinate bounds for Japan
const JAPAN_LAT_MIN = 24;
const JAPAN_LAT_MAX = 46;
const JAPAN_LNG_MIN = 122;
const JAPAN_LNG_MAX = 154;

// Zod schema for coordinates
const coordinatesSchema = z.object({
  lat: z
    .number()
    .min(JAPAN_LAT_MIN, `Latitude must be >= ${JAPAN_LAT_MIN} (Japan bounds)`)
    .max(JAPAN_LAT_MAX, `Latitude must be <= ${JAPAN_LAT_MAX} (Japan bounds)`),
  lng: z
    .number()
    .min(JAPAN_LNG_MIN, `Longitude must be >= ${JAPAN_LNG_MIN} (Japan bounds)`)
    .max(JAPAN_LNG_MAX, `Longitude must be <= ${JAPAN_LNG_MAX} (Japan bounds)`),
});

// Zod schema for operating hours period
const operatingPeriodSchema = z.object({
  day: z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]),
  open: z.string(),
  close: z.string(),
  isOvernight: z.boolean().optional(),
});

// Zod schema for operating hours
const operatingHoursSchema = z.object({
  timezone: z.string().default("Asia/Tokyo"),
  periods: z.array(operatingPeriodSchema),
  notes: z.string().optional(),
});

// Main AI location schema
export const aiLocationSchema = z.object({
  // Required fields
  name: z.string().min(1, "Name is required"),
  region: z.enum(VALID_REGIONS, {
    errorMap: () => ({
      message: `Region must be one of: ${VALID_REGIONS.join(", ")}`,
    }),
  }),
  city: z.string().min(1, "City is required"),
  category: z.string().min(1, "Category is required"),
  coordinates: coordinatesSchema,

  // Optional fields
  neighborhood: z.string().optional(),
  prefecture: z.string().optional(),
  short_description: z.string().optional(),
  description: z.string().optional(),
  estimated_duration: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  review_count: z.number().int().min(0).optional(),
  min_budget: z.string().optional(),
  is_seasonal: z.boolean().optional(),
  seasonal_type: z
    .enum(["festival", "seasonal_attraction", "winter_closure"])
    .optional(),
  seasonal_months: z.string().optional(),
  operating_hours: operatingHoursSchema.optional(),
});

// Schema for array of locations
export const aiLocationsArraySchema = z.array(aiLocationSchema);

// Type inference from schema
export type AILocation = z.infer<typeof aiLocationSchema>;
export type AILocationsArray = z.infer<typeof aiLocationsArraySchema>;

// Category normalization map (matches base-scraper.ts)
const CATEGORY_MAP: Record<string, string> = {
  // Culture
  temple: "culture",
  shrine: "culture",
  museum: "culture",
  gallery: "culture",
  art: "culture",
  heritage: "culture",
  historic: "culture",
  historical: "culture",
  castle: "culture",
  palace: "culture",
  traditional: "culture",
  cultural: "culture",
  theatre: "culture",
  theater: "culture",
  festival: "culture",
  event: "culture",

  // Attraction
  attraction: "attraction",
  "theme park": "attraction",
  amusement: "attraction",
  zoo: "attraction",
  aquarium: "attraction",
  entertainment: "attraction",
  sightseeing: "attraction",
  landmark: "attraction",
  tower: "attraction",

  // Nature
  nature: "nature",
  park: "nature",
  garden: "nature",
  mountain: "nature",
  beach: "nature",
  lake: "nature",
  river: "nature",
  waterfall: "nature",
  "hot spring": "nature",
  onsen: "nature",
  hiking: "nature",
  outdoor: "nature",
  natural: "nature",

  // Food
  restaurant: "food",
  food: "food",
  dining: "food",
  cafe: "food",
  bar: "food",
  cuisine: "food",
  eat: "food",
  drink: "food",
  ramen: "food",
  sushi: "food",
  izakaya: "food",
  market: "food",

  // Shopping
  shopping: "shopping",
  shop: "shopping",
  mall: "shopping",
  store: "shopping",
  retail: "shopping",

  // Hotel
  hotel: "hotel",
  accommodation: "hotel",
  resort: "hotel",
  lodging: "hotel",
  stay: "hotel",
  inn: "hotel",
  ryokan: "hotel",
};

/**
 * Normalizes a category string to one of the valid categories.
 * Matches the logic in base-scraper.ts.
 */
export function normalizeCategory(sourceCategory: string): string {
  const normalized = sourceCategory.toLowerCase().trim();

  // Check for exact matches first
  if (
    VALID_CATEGORIES.includes(normalized as (typeof VALID_CATEGORIES)[number])
  ) {
    return normalized;
  }

  // Check category map for exact match
  if (CATEGORY_MAP[normalized]) {
    return CATEGORY_MAP[normalized];
  }

  // Check for partial matches, prioritizing longer/more specific matches
  const sortedKeys = Object.keys(CATEGORY_MAP).sort(
    (a, b) => b.length - a.length,
  );
  for (const key of sortedKeys) {
    if (normalized.includes(key)) {
      return CATEGORY_MAP[key];
    }
  }

  // Default to attraction if no match
  return "attraction";
}

/**
 * Normalizes a location name for duplicate detection.
 * Removes special characters, converts to lowercase, trims whitespace.
 */
export function normalizeLocationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
