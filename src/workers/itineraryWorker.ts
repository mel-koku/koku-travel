/**
 * Itinerary Worker — Standalone entry point for itinerary generation.
 *
 * This module re-exports the core generation pipeline in a form that can be
 * deployed as an independent Node.js process (Express/Fastify) on a VPS,
 * separate from the Next.js Vercel deployment.
 *
 * ## Why this exists
 *
 * Itinerary generation is the most expensive Vercel serverless invocation:
 * 55s timeout, 8GB memory, 3+ external API calls, heavy CPU scoring.
 * Moving it to a flat-rate VPS eliminates the per-invocation compute cost.
 *
 * ## Architecture
 *
 * On Vercel (current):
 *   Client -> POST /api/itinerary/plan -> itineraryEngine -> response
 *
 * On VPS (future):
 *   Client -> POST /api/itinerary/plan (Vercel proxy) -> enqueue job
 *   VPS Worker -> dequeue -> itineraryEngine -> write result to Redis
 *   Client -> poll /api/itinerary/status/:jobId -> result from Redis
 *
 * ## Dependencies
 *
 * The generation pipeline requires these external services:
 *
 * | Service         | Env Var                          | Required | Used For                  |
 * |-----------------|----------------------------------|----------|---------------------------|
 * | Supabase        | NEXT_PUBLIC_SUPABASE_URL         | Yes      | Location data, ratings    |
 * | Supabase        | SUPABASE_SERVICE_ROLE_KEY        | Yes      | RLS bypass for server     |
 * | Gemini          | GOOGLE_GENERATIVE_AI_API_KEY     | No       | Intent, prose, refinement |
 * | Mapbox          | ROUTING_MAPBOX_ACCESS_TOKEN      | No       | Walk/drive routing        |
 * | Google Maps     | ROUTING_GOOGLE_MAPS_API_KEY      | No       | Transit routing           |
 * | Upstash Redis   | UPSTASH_REDIS_REST_URL           | No       | Caching                   |
 * | Upstash Redis   | UPSTASH_REDIS_REST_TOKEN         | No       | Caching                   |
 * | OpenWeatherMap  | (hardcoded endpoint)             | No       | Weather scoring           |
 *
 * All optional services degrade gracefully (heuristic routing, no LLM passes,
 * no caching, seasonal weather patterns).
 *
 * ## Extraction Checklist
 *
 * When moving to a standalone process:
 * 1. Remove `import "server-only"` from all src/lib/server/*.ts files
 *    (or conditionally skip it based on environment)
 * 2. Replace `@/` path aliases with relative imports or configure tsconfig
 * 3. Set up dotenv for environment variables
 * 4. Add Express/Fastify HTTP layer around generateTrip()
 * 5. Add job queue (BullMQ + Redis, or simple HTTP polling)
 * 6. Add health check endpoint
 * 7. Add PM2 or systemd for process management
 */

// Re-export the core generation function and types.
// These are the only exports needed by the worker process.
export { generateTripFromBuilderData } from "@/lib/server/itineraryEngine";
export type { GeneratedTripResult } from "@/lib/server/itineraryEngine";

// Re-export validation (used by the API route after generation)
export { validateTripConstraints } from "@/lib/server/itineraryEngine";
export { validateItinerary } from "@/lib/validation/itineraryValidator";

// Re-export cache operations (worker needs to read/write cache)
export { getCachedItinerary, cacheItinerary, generateCacheKey } from "@/lib/cache/itineraryCache";

// Re-export traveler profile builder (API route uses this before calling generation)
export { buildTravelerProfile } from "@/lib/domain/travelerProfile";

// Types needed by the HTTP layer
export type { TripBuilderData } from "@/types/trip";
export type { Trip } from "@/types/tripDomain";
export type { Itinerary } from "@/types/itinerary";
export type { GeneratedGuide } from "@/types/llmConstraints";
