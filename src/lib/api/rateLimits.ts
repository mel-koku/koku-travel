/**
 * Centralized rate limit configuration for all API routes.
 * Each entry specifies maxRequests per windowMs (milliseconds).
 */
export const RATE_LIMITS = {
  LOCATIONS: { maxRequests: 100, windowMs: 60_000 },
  PLACES: { maxRequests: 60, windowMs: 60_000 },
  ITINERARY_PLAN: { maxRequests: 100, windowMs: 60_000 },
  ITINERARY_REFINE: { maxRequests: 30, windowMs: 60_000 },
  ITINERARY_SCHEDULE: { maxRequests: 30, windowMs: 60_000 },
  ITINERARY_AVAILABILITY: { maxRequests: 60, windowMs: 60_000 },
  SMART_PROMPTS: { maxRequests: 30, windowMs: 60_000 },
  ROUTING: { maxRequests: 100, windowMs: 60_000 },
  WEBHOOK: { maxRequests: 30, windowMs: 60_000 },
  HEALTH: { maxRequests: 200, windowMs: 60_000 },
  CHAT: { maxRequests: 30, windowMs: 60_000 },
} as const;
