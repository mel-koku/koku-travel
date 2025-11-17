import { NextRequest, NextResponse } from "next/server";
import { refineDay, type RefinementType } from "@/lib/server/refinementEngine";
import type { Trip } from "@/types/tripDomain";
import { logger } from "@/lib/logger";

/**
 * POST /api/itinerary/refine
 * 
 * Refines a specific day in a trip based on refinement type.
 * 
 * Request body:
 * {
 *   trip: Trip,
 *   dayIndex: number,
 *   type: RefinementType ("too_busy" | "too_light" | "more_food" | "more_culture" | "more_kid_friendly" | "more_rest")
 * }
 * 
 * Response:
 * {
 *   trip: Trip (with refined day)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trip, dayIndex, type } = body as {
      trip: Trip;
      dayIndex: number;
      type: RefinementType;
    };

    if (!trip) {
      return NextResponse.json({ error: "trip is required" }, { status: 400 });
    }

    if (typeof dayIndex !== "number" || dayIndex < 0) {
      return NextResponse.json({ error: "dayIndex must be a non-negative number" }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    const validTypes: RefinementType[] = [
      "too_busy",
      "too_light",
      "more_food",
      "more_culture",
      "more_kid_friendly",
      "more_rest",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid refinement type: ${type}` }, { status: 400 });
    }

    // Refine the day
    const refinedDay = refineDay({ trip, dayIndex, type });

    // Update trip with refined day
    const updatedTrip: Trip = {
      ...trip,
      days: trip.days.map((day, index) => (index === dayIndex ? refinedDay : day)),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      trip: updatedTrip,
    });
  } catch (error) {
    logger.error("Failed to refine itinerary", error);
    return NextResponse.json(
      { error: "Failed to refine itinerary", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

