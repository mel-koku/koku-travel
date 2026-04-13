import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { validateRequestBody, tripBuilderDataSchema } from "@/lib/api/schemas";
import { badRequest, notFound, internalError } from "@/lib/api/errors";
import { fetchTripById, saveTrip, deleteTrip } from "@/services/sync/tripSync";
import type { StoredTrip } from "@/services/trip/types";
import { validateItineraryWithDatabase } from "@/lib/validation/itineraryValidator";

/**
 * UUID validation schema
 */
const uuidSchema = z.string().uuid("Invalid trip ID format");

/**
 * Schema for recommendation reason
 */
const recommendationReasonSchema = z.object({
  primaryReason: z.string(),
  factors: z.array(z.object({
    factor: z.string(),
    score: z.number(),
    reasoning: z.string(),
  })).optional(),
  alternativesConsidered: z.array(z.string()).optional(),
}).strip();

/**
 * Schema for operating window
 */
const operatingWindowSchema = z.object({
  opensAt: z.string(),
  closesAt: z.string(),
  note: z.string().optional(),
  status: z.enum(["within", "outside", "unknown"]).optional(),
});

/**
 * Schema for scheduled visit
 */
const scheduledVisitSchema = z.object({
  arrivalTime: z.string(),
  departureTime: z.string(),
  arrivalBufferMinutes: z.number().optional(),
  departureBufferMinutes: z.number().optional(),
  operatingWindow: operatingWindowSchema.optional(),
  status: z.enum(["scheduled", "tentative", "out-of-hours", "closed"]).optional(),
});

/**
 * Schema for travel segment
 */
const travelSegmentSchema = z.object({
  mode: z.enum(["walking", "driving", "cycling", "transit", "rideshare"]),
  durationMinutes: z.number(),
  distanceMeters: z.number().optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  instructions: z.array(z.string()).optional(),
  notes: z.string().optional(),
  path: z.array(z.object({ lat: z.number(), lng: z.number() })).optional(),
  isEstimated: z.boolean().optional(),
});

/**
 * Schema for city transition
 */
const cityTransitionSchema = z.object({
  fromCityId: z.string(),
  toCityId: z.string(),
  mode: z.enum(["walking", "driving", "cycling", "transit", "rideshare"]),
  durationMinutes: z.number(),
  distanceMeters: z.number().optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Schema for itinerary activity
 */
const itineraryActivitySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("place"),
    id: z.string(),
    title: z.string().max(500),
    timeOfDay: z.enum(["morning", "afternoon", "evening"]),
    durationMin: z.number().optional(),
    neighborhood: z.string().max(200).optional(),
    tags: z.array(z.string().max(100)).optional(),
    notes: z.string().max(2000).optional(),
    locationId: z.string().optional(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
    mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
    recommendationReason: recommendationReasonSchema.optional(),
    schedule: scheduledVisitSchema.optional(),
    travelFromPrevious: travelSegmentSchema.optional(),
    travelToNext: travelSegmentSchema.optional(),
    operatingWindow: operatingWindowSchema.optional(),
    availabilityStatus: z.enum(["available", "limited", "unavailable", "unknown"]).optional(),
    availabilityMessage: z.string().optional(),
    manualStartTime: z.string().optional(),
  }).strip(),
  z.object({
    kind: z.literal("note"),
    id: z.string(),
    title: z.literal("Note"),
    timeOfDay: z.enum(["morning", "afternoon", "evening"]),
    notes: z.string().max(5000),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  }).strip(),
]);

/**
 * Schema for itinerary time bounds
 */
const itineraryTimeSchema = z.object({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().optional(),
});

/**
 * Schema for itinerary day
 */
const itineraryDaySchema = z.object({
  id: z.string(),
  dateLabel: z.string().optional(),
  timezone: z.string().optional(),
  bounds: itineraryTimeSchema.optional(),
  weekday: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]).optional(),
  cityId: z.string().optional(),
  cityTransition: cityTransitionSchema.optional(),
  activities: z.array(itineraryActivitySchema).max(50),
  isDayTrip: z.boolean().optional(),
  baseCityId: z.string().optional(),
  dayTripTravelMinutes: z.number().optional(),
}).strip();

/**
 * Schema for itinerary
 */
const itinerarySchema = z.object({
  days: z.array(itineraryDaySchema).max(30),
  timezone: z.string().optional(),
}).strip();

/**
 * Schema for updating a trip (partial update)
 */
const updateTripSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  itinerary: itinerarySchema.optional(),
  builderData: tripBuilderDataSchema.partial().strip().optional(),
  updatedAt: z.string().optional(),
}).strip();

/**
 * GET /api/trips/[id]
 *
 * Gets a single trip by ID for the authenticated user.
 *
 * Response:
 * {
 *   trip: StoredTrip
 * }
 *
 * @throws Returns 400 if trip ID is invalid
 * @throws Returns 401 if not authenticated
 * @throws Returns 404 if trip not found
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id: tripId } = await props.params;
  return withApiHandler(
    async (_req, { context, user }) => {
      // Validate trip ID format
      const idValidation = uuidSchema.safeParse(tripId);
      if (!idValidation.success) {
        return badRequest("Invalid trip ID format", undefined, { requestId: context.requestId });
      }

      const supabase = await createClient();
      const result = await fetchTripById(supabase, user!.id, tripId);

      if (!result.success) {
        logger.error("Failed to fetch trip", new Error(result.error), {
          requestId: context.requestId,
          userId: user!.id,
          tripId,
        });
        return internalError("Failed to fetch trip", undefined, { requestId: context.requestId });
      }

      if (!result.data) {
        return notFound("Trip not found", { requestId: context.requestId });
      }

      return NextResponse.json({ trip: result.data });
    },
    { rateLimit: RATE_LIMITS.TRIPS, requireAuth: true },
  )(request);
}

/**
 * PATCH /api/trips/[id]
 *
 * Updates a trip for the authenticated user.
 *
 * Request body (all fields optional):
 * {
 *   name?: string,
 *   itinerary?: { days: ItineraryDay[] },
 *   builderData?: TripBuilderData
 * }
 *
 * Response:
 * {
 *   trip: StoredTrip
 * }
 *
 * @throws Returns 400 if request body is invalid
 * @throws Returns 401 if not authenticated
 * @throws Returns 404 if trip not found
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id: tripId } = await props.params;
  return withApiHandler(
    async (req, { context, user }) => {
      // Validate trip ID format
      const idValidation = uuidSchema.safeParse(tripId);
      if (!idValidation.success) {
        return badRequest("Invalid trip ID format", undefined, { requestId: context.requestId });
      }

      // Validate request body (2MB max)
      const validation = await validateRequestBody(req, updateTripSchema, 2 * 1024 * 1024);
      if (!validation.success) {
        return badRequest("Invalid request body", {
          errors: validation.error.issues,
        }, {
          requestId: context.requestId,
        });
      }

      const updates = validation.data;

      // Check if there are any updates
      if (!updates.name && !updates.itinerary && !updates.builderData) {
        return badRequest("No updates provided", undefined, { requestId: context.requestId });
      }

      const supabase = await createClient();

      // First fetch the existing trip
      const existingResult = await fetchTripById(supabase, user!.id, tripId);

      if (!existingResult.success) {
        logger.error("Failed to fetch trip for update", new Error(existingResult.error), {
          requestId: context.requestId,
          userId: user!.id,
          tripId,
        });
        return internalError("Failed to update trip", undefined, { requestId: context.requestId });
      }

      if (!existingResult.data) {
        return notFound("Trip not found", { requestId: context.requestId });
      }

      // Optimistic locking: reject if client's snapshot is stale
      if (updates.updatedAt && existingResult.data.updatedAt !== updates.updatedAt) {
        return NextResponse.json(
          { error: "Trip modified since last load", code: "CONFLICT" },
          { status: 409 },
        );
      }

      // Merge updates with existing trip
      const updatedTrip: StoredTrip = {
        ...existingResult.data,
        name: updates.name ?? existingResult.data.name,
        itinerary: updates.itinerary ?? existingResult.data.itinerary,
        builderData: updates.builderData ?? existingResult.data.builderData,
        updatedAt: new Date().toISOString(),
      };

      // Validate itinerary data integrity — block on errors, allow warnings through
      if (updatedTrip.itinerary) {
        const validationResult = await validateItineraryWithDatabase(supabase, updatedTrip.itinerary);
        if (validationResult.summary.errorCount > 0) {
          const errors = validationResult.issues.filter((i) => i.severity === "error");
          logger.warn("Itinerary validation errors — blocking save", {
            requestId: context.requestId,
            tripId,
            errorCount: validationResult.summary.errorCount,
            errors,
          });
          return badRequest("Itinerary has validation errors", {
            errors,
            errorCount: validationResult.summary.errorCount,
          }, { requestId: context.requestId });
        }
        if (validationResult.summary.warningCount > 0) {
          logger.info("Itinerary validation warnings", {
            requestId: context.requestId,
            tripId,
            warningCount: validationResult.summary.warningCount,
            warnings: validationResult.issues.filter((i) => i.severity === "warning").slice(0, 5),
          });
        }
      }

      const saveResult = await saveTrip(supabase, user!.id, updatedTrip);

      if (!saveResult.success) {
        logger.error("Failed to save trip update", new Error(saveResult.error), {
          requestId: context.requestId,
          userId: user!.id,
          tripId,
        });
        return internalError("Failed to update trip", undefined, { requestId: context.requestId });
      }

      return NextResponse.json({ trip: saveResult.data });
    },
    { rateLimit: RATE_LIMITS.TRIPS, requireAuth: true },
  )(request);
}

/**
 * DELETE /api/trips/[id]
 *
 * Soft deletes a trip for the authenticated user.
 * Sets the deleted_at timestamp rather than permanently removing the record.
 *
 * Response:
 * {
 *   success: true
 * }
 *
 * @throws Returns 400 if trip ID is invalid
 * @throws Returns 401 if not authenticated
 * @throws Returns 429 if rate limit exceeded
 * @throws Returns 500 for server errors
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id: tripId } = await props.params;
  return withApiHandler(
    async (_req, { context, user }) => {
      // Validate trip ID format
      const idValidation = uuidSchema.safeParse(tripId);
      if (!idValidation.success) {
        return badRequest("Invalid trip ID format", undefined, { requestId: context.requestId });
      }

      const supabase = await createClient();
      const result = await deleteTrip(supabase, user!.id, tripId);

      if (!result.success) {
        if (result.notFound) {
          return notFound("Trip not found", { requestId: context.requestId });
        }
        logger.error("Failed to delete trip", new Error(result.error), {
          requestId: context.requestId,
          userId: user!.id,
          tripId,
        });
        return internalError("Failed to delete trip", undefined, { requestId: context.requestId });
      }

      return NextResponse.json({ success: true });
    },
    { rateLimit: RATE_LIMITS.TRIPS, requireAuth: true },
  )(request);
}
