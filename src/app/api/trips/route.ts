import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { validateRequestBody, tripBuilderDataSchema } from "@/lib/api/schemas";
import { badRequest, internalError } from "@/lib/api/errors";
import { fetchTrips, saveTrip } from "@/services/sync/tripSync";
import type { StoredTrip } from "@/services/trip/types";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { isFullAccessEnabled } from "@/lib/billing/accessServer";
import { stampFreeUnlockedAt } from "@/app/api/trips/_stampFreeUnlock";

/**
 * Schema for itinerary activity (loose validation for creation)
 * Activities can be place or note kind with various optional fields
 */
const itineraryActivitySchemaLoose = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("place"),
    id: z.string(),
    title: z.string().max(500),
    timeOfDay: z.enum(["morning", "afternoon", "evening"]),
    locationId: z.string().optional(),
  }).strip(),
  z.object({
    kind: z.literal("note"),
    id: z.string(),
    title: z.string().max(500),
    timeOfDay: z.enum(["morning", "afternoon", "evening"]),
    notes: z.string().max(5000),
  }).strip(),
]);

/**
 * Schema for itinerary day (loose validation for creation)
 */
const itineraryDaySchemaLoose = z.object({
  id: z.string(),
  activities: z.array(itineraryActivitySchemaLoose).max(50).default([]),
}).strip();

/**
 * Schema for itinerary (loose validation for creation)
 */
const itinerarySchemaLoose = z.object({
  days: z.array(itineraryDaySchemaLoose).max(30).default([]),
}).strip().default({ days: [] });

/**
 * Schema for creating a new trip
 */
const createTripSchema = z.object({
  id: z.string().uuid().optional(), // Allow client-generated UUID
  name: z.string().min(1).max(500).default("Untitled itinerary"),
  itinerary: itinerarySchemaLoose,
  builderData: tripBuilderDataSchema.partial().strip().default({}),
});

/**
 * GET /api/trips
 *
 * Lists all trips for the authenticated user.
 *
 * Response:
 * {
 *   trips: StoredTrip[],
 *   count: number
 * }
 *
 * @throws Returns 401 if not authenticated
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export const GET = withApiHandler(
  async (_request: NextRequest, { context, user }) => {
    const supabase = await createClient();
    const result = await fetchTrips(supabase, user!.id);

    if (!result.success) {
      logger.error("Failed to fetch trips", new Error(result.error), {
        requestId: context.requestId,
        userId: user!.id,
      });
      return internalError("Failed to fetch trips", undefined, { requestId: context.requestId });
    }

    return NextResponse.json({
      trips: result.data,
      count: result.data?.length ?? 0,
    });
  },
  { rateLimit: RATE_LIMITS.TRIPS, requireAuth: true },
);

/**
 * POST /api/trips
 *
 * Creates a new trip for the authenticated user.
 *
 * Request body:
 * {
 *   id?: string (UUID, optional - will be generated if not provided),
 *   name?: string (default: "Untitled itinerary"),
 *   itinerary?: { days: ItineraryDay[] } (default: { days: [] }),
 *   builderData?: TripBuilderData (default: {})
 * }
 *
 * Response:
 * {
 *   trip: StoredTrip
 * }
 *
 * @throws Returns 400 if request body is invalid
 * @throws Returns 401 if not authenticated
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export const POST = withApiHandler(
  async (request: NextRequest, { context, user }) => {
    // Validate request body (2MB max for itinerary data)
    const validation = await validateRequestBody(request, createTripSchema, 2 * 1024 * 1024);
    if (!validation.success) {
      return badRequest("Invalid request body", {
        errors: validation.error.issues,
      }, {
        requestId: context.requestId,
      });
    }

    const { id, name, itinerary, builderData } = validation.data;

    const supabase = await createClient();
    const now = new Date().toISOString();

    // POST is create-only. If the client passes an id that already exists
    // (own trip OR another user's trip), reject uniformly with 409 instead
    // of letting the upsert hit RLS and 500. The unified error closes the
    // existence-oracle that previously distinguished "exists but not yours"
    // (500) from "doesn't exist" (201). Use service-role for the existence
    // probe so we can see other users' rows; we only return a boolean.
    if (id) {
      const admin = getServiceRoleClient();
      const { data: existing } = await admin
        .from("trips")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          { error: "Trip with this id already exists; use PATCH to update", code: "CONFLICT" },
          { status: 409, headers: { "X-Request-ID": context.requestId } },
        );
      }
    }

    // Create the trip object
    const trip: StoredTrip = {
      id: id ?? crypto.randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
      itinerary,
      builderData,
    };

    const result = await saveTrip(supabase, user!.id, trip);

    if (!result.success) {
      logger.error("Failed to create trip", new Error(result.error), {
        requestId: context.requestId,
        userId: user!.id,
      });
      return internalError("Failed to create trip", undefined, { requestId: context.requestId });
    }

    const days = result.data?.itinerary?.days;
    const hasGeneratedItinerary = Array.isArray(days) && days.length > 0;

    if (hasGeneratedItinerary && (await isFullAccessEnabled())) {
      try {
        // stampFreeUnlockedAt swallows its own errors; the outer try/catch here
        // guards against unexpected rejections so the response is never
        // degraded by a non-critical stamp failure.
        await stampFreeUnlockedAt(supabase, result.data!.id, user!.id);
      } catch {
        // intentionally swallowed — stamp failure must not affect the 201
      }
    }

    return NextResponse.json({ trip: result.data }, { status: 201 });
  },
  { rateLimit: RATE_LIMITS.TRIPS, requireAuth: true, requireJson: true },
);
