import { NextRequest, NextResponse } from "next/server";
import { generateTripFromBuilderData, validateTripConstraints } from "@/lib/server/itineraryEngine";
import { buildTravelerProfile } from "@/lib/domain/travelerProfile";
import type { TripBuilderData } from "@/types/trip";
import { logger } from "@/lib/logger";

/**
 * POST /api/itinerary/plan
 * 
 * Generates an itinerary from TripBuilderData and returns a Trip domain model.
 * 
 * Request body:
 * {
 *   builderData: TripBuilderData,
 *   tripId?: string (optional, will be generated if not provided)
 * }
 * 
 * Response:
 * {
 *   trip: Trip,
 *   validation: { valid: boolean, issues: string[] }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { builderData, tripId } = body as { builderData: TripBuilderData; tripId?: string };

    if (!builderData) {
      return NextResponse.json({ error: "builderData is required" }, { status: 400 });
    }

    // Generate trip ID if not provided
    const finalTripId = tripId ?? `trip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Ensure travelerProfile is built
    if (!builderData.travelerProfile) {
      builderData.travelerProfile = buildTravelerProfile(builderData);
    }

    // Generate trip
    const trip = await generateTripFromBuilderData(builderData, finalTripId);

    // Validate constraints
    const validation = validateTripConstraints(trip);

    return NextResponse.json({
      trip,
      validation,
    });
  } catch (error) {
    logger.error("Failed to generate itinerary", error);
    return NextResponse.json(
      { error: "Failed to generate itinerary", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

