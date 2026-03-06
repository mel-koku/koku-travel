/**
 * Centralized rate limit configuration for all API routes.
 * Each entry specifies maxRequests per windowMs (milliseconds).
 */
export const RATE_LIMITS = {
  LOCATIONS: { maxRequests: 100, windowMs: 60_000 },
  LOCATIONS_BATCH: { maxRequests: 200, windowMs: 60_000 },
  PLACES: { maxRequests: 60, windowMs: 60_000 },
  ITINERARY_PLAN: { maxRequests: 20, windowMs: 60_000 },
  /** Stricter limit for unauthenticated itinerary generation (expensive AI) */
  ITINERARY_PLAN_UNAUTH: { maxRequests: 5, windowMs: 60_000, keySuffix: "unauth" },
  ITINERARY_REFINE: { maxRequests: 30, windowMs: 60_000 },
  ITINERARY_SCHEDULE: { maxRequests: 30, windowMs: 60_000 },
  ITINERARY_AVAILABILITY: { maxRequests: 60, windowMs: 60_000 },
  SMART_PROMPTS: { maxRequests: 30, windowMs: 60_000 },
  ROUTING: { maxRequests: 100, windowMs: 60_000 },
  WEBHOOK: { maxRequests: 30, windowMs: 60_000 },
  HEALTH: { maxRequests: 200, windowMs: 60_000 },
  CHAT: { maxRequests: 10, windowMs: 60_000 },
  AI_RECOMMEND: { maxRequests: 20, windowMs: 60_000 },
  TRIPS: { maxRequests: 100, windowMs: 60_000 },
  RATINGS: { maxRequests: 60, windowMs: 60_000 },
  BOOKINGS: { maxRequests: 10, windowMs: 60_000 },
  SHARED: { maxRequests: 60, windowMs: 60_000 },
  GEOCODE: { maxRequests: 60, windowMs: 60_000 },
  PEOPLE: { maxRequests: 100, windowMs: 60_000 },
  EXPERIENCES: { maxRequests: 100, windowMs: 60_000 },
  CITIES: { maxRequests: 100, windowMs: 60_000 },
  INQUIRIES: { maxRequests: 10, windowMs: 60_000 },
} as const;
