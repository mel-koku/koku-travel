import type { Location, LocationOperatingHours } from "@/types/location";

/**
 * Minimal test location data for unit tests.
 * These are simple test fixtures, not real location data.
 */

/**
 * Sample operating hours for testing
 */
const TEST_OPERATING_HOURS: LocationOperatingHours = {
  periods: [
    { day: "monday", open: "09:00", close: "17:00" },
    { day: "tuesday", open: "09:00", close: "17:00" },
    { day: "wednesday", open: "09:00", close: "17:00" },
    { day: "thursday", open: "09:00", close: "17:00" },
    { day: "friday", open: "09:00", close: "17:00" },
    { day: "saturday", open: "10:00", close: "18:00" },
    { day: "sunday", open: "10:00", close: "18:00" },
  ],
};

/**
 * Factory function to create test locations with optional overrides.
 *
 * @param overrides - Optional partial location to merge with defaults
 * @returns A test Location object
 *
 * @example
 * ```ts
 * const location = createTestLocation({ name: "Custom Test Temple" });
 * ```
 */
export function createTestLocation(overrides: Partial<Location> = {}): Location {
  const baseId = overrides.id ?? `test-location-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    id: baseId,
    name: overrides.name ?? "Test Location",
    region: overrides.region ?? "Kansai",
    city: overrides.city ?? "Kyoto",
    prefecture: overrides.prefecture ?? "Kyoto",
    category: overrides.category ?? "temple",
    image: overrides.image ?? "/images/placeholder.jpg",
    placeId: overrides.placeId ?? `ChIJ-test-place-id-${baseId}`,
    primaryPhotoUrl: overrides.primaryPhotoUrl ?? null,
    coordinates: overrides.coordinates ?? { lat: 34.9948, lng: 135.7850 },
    minBudget: overrides.minBudget ?? 500,
    estimatedDuration: overrides.estimatedDuration ?? "1-2 hours",
    operatingHours: overrides.operatingHours ?? TEST_OPERATING_HOURS,
    recommendedVisit: overrides.recommendedVisit ?? {
      typicalMinutes: 60,
      minMinutes: 30,
    },
    preferredTransitModes: overrides.preferredTransitModes ?? ["transit", "walk"],
    timezone: overrides.timezone ?? "Asia/Tokyo",
    shortDescription: overrides.shortDescription ?? "A test location for unit testing",
    rating: overrides.rating ?? 4.5,
    reviewCount: overrides.reviewCount ?? 1000,
    ...overrides,
  };
}

/**
 * Pre-built test locations for common test scenarios
 */
export const TEST_LOCATIONS = {
  /**
   * A temple in Kyoto - good for testing basic location functionality
   */
  kyotoTemple: createTestLocation({
    id: "test-kyoto-temple",
    name: "Test Kiyomizu Temple",
    region: "Kansai",
    city: "Kyoto",
    prefecture: "Kyoto",
    category: "temple",
    placeId: "ChIJ-test-kiyomizu",
    coordinates: { lat: 34.9948, lng: 135.7850 },
    rating: 4.7,
    reviewCount: 15000,
  }),

  /**
   * A shrine in Tokyo - good for testing different region
   */
  tokyoShrine: createTestLocation({
    id: "test-tokyo-shrine",
    name: "Test Meiji Shrine",
    region: "Kanto",
    city: "Tokyo",
    prefecture: "Tokyo",
    category: "shrine",
    placeId: "ChIJ-test-meiji",
    coordinates: { lat: 35.6764, lng: 139.6993 },
    rating: 4.6,
    reviewCount: 20000,
  }),

  /**
   * A restaurant - good for testing different category
   */
  osakaRestaurant: createTestLocation({
    id: "test-osaka-restaurant",
    name: "Test Dotonbori Restaurant",
    region: "Kansai",
    city: "Osaka",
    prefecture: "Osaka",
    category: "restaurant",
    placeId: "ChIJ-test-dotonbori",
    coordinates: { lat: 34.6687, lng: 135.5018 },
    rating: 4.2,
    reviewCount: 5000,
    minBudget: 2000,
  }),

  /**
   * A museum in Hiroshima - good for testing another region
   */
  hiroshimaMuseum: createTestLocation({
    id: "test-hiroshima-museum",
    name: "Test Peace Memorial Museum",
    region: "Chugoku",
    city: "Hiroshima",
    prefecture: "Hiroshima",
    category: "museum",
    placeId: "ChIJ-test-peace-museum",
    coordinates: { lat: 34.3915, lng: 132.4536 },
    rating: 4.8,
    reviewCount: 12000,
    estimatedDuration: "2-3 hours",
    recommendedVisit: {
      typicalMinutes: 120,
      minMinutes: 60,
    },
  }),

  /**
   * A park in Nara - good for testing outdoor locations
   */
  naraPark: createTestLocation({
    id: "test-nara-park",
    name: "Test Nara Park",
    region: "Kansai",
    city: "Nara",
    prefecture: "Nara",
    category: "park",
    placeId: "ChIJ-test-nara-park",
    coordinates: { lat: 34.6851, lng: 135.8048 },
    rating: 4.5,
    reviewCount: 8000,
    minBudget: 0,
    estimatedDuration: "1-3 hours",
  }),
};

/**
 * Array of all test locations for convenience
 */
export const TEST_LOCATIONS_ARRAY = Object.values(TEST_LOCATIONS);

/**
 * Helper to convert a test location to a database row format.
 * Useful for mocking Supabase responses.
 *
 * @param location - The location to convert
 * @returns Database row format
 */
export function locationToDbRow(location: Location): Record<string, unknown> {
  return {
    id: location.id,
    name: location.name,
    region: location.region,
    city: location.city,
    prefecture: location.prefecture,
    category: location.category,
    image: location.image,
    place_id: location.placeId,
    primary_photo_url: location.primaryPhotoUrl,
    coordinates: location.coordinates,
    min_budget: location.minBudget,
    estimated_duration: location.estimatedDuration,
    operating_hours: location.operatingHours,
    recommended_visit: location.recommendedVisit,
    preferred_transit_modes: location.preferredTransitModes,
    timezone: location.timezone,
    short_description: location.shortDescription,
    rating: location.rating,
    review_count: location.reviewCount,
  };
}
