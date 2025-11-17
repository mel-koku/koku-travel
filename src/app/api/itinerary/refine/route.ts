import { NextRequest, NextResponse } from "next/server";
import { refineDay, type RefinementType } from "@/lib/server/refinementEngine";
import { convertItineraryToTrip } from "@/lib/server/itineraryEngine";
import { badRequest, internalError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import type { Itinerary, ItineraryActivity, ItineraryDay, RecommendationReason as ItineraryRecommendationReason } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { Trip, TripActivity, TripDay, RecommendationReason as TripRecommendationReason } from "@/types/tripDomain";

// Simple stub request format (as specified in plan)
type RefineRequestBody = {
  trip: Trip;
  refinementType: RefinementType;
  dayIndex?: number;
};

// Legacy request format (for backward compatibility)
type RefinementRequest = {
  tripId: string;
  dayIndex: number;
  refinementType: RefinementType;
  itinerary: Itinerary;
  builderData: TripBuilderData;
};

type RefinementResponse = {
  refinedDay: ItineraryDay;
  updatedTrip: Trip;
};

const VALID_REFINEMENT_TYPES: RefinementType[] = [
  "too_busy",
  "too_light",
  "more_food",
  "more_culture",
  "more_kid_friendly",
  "more_rest",
];

const convertRecommendationReason = (
  reason: TripRecommendationReason | undefined,
): ItineraryRecommendationReason | undefined => {
  if (!reason) {
    return undefined;
  }

  // Convert factors object to array format
  const factorsArray: Array<{ factor: string; score: number; reasoning: string }> = [];
  if (reason.factors) {
    if (reason.factors.interest !== undefined) {
      factorsArray.push({
        factor: "Interest Match",
        score: reason.factors.interest,
        reasoning: `Interest match score: ${reason.factors.interest}`,
      });
    }
    if (reason.factors.proximity !== undefined) {
      factorsArray.push({
        factor: "Proximity",
        score: reason.factors.proximity,
        reasoning: `Proximity score: ${reason.factors.proximity}`,
      });
    }
    if (reason.factors.budget !== undefined) {
      factorsArray.push({
        factor: "Budget Fit",
        score: reason.factors.budget,
        reasoning: `Budget fit score: ${reason.factors.budget}`,
      });
    }
    if (reason.factors.accessibility !== undefined) {
      factorsArray.push({
        factor: "Accessibility",
        score: reason.factors.accessibility,
        reasoning: `Accessibility score: ${reason.factors.accessibility}`,
      });
    }
    if (reason.factors.time !== undefined) {
      factorsArray.push({
        factor: "Time Fit",
        score: reason.factors.time,
        reasoning: `Time fit score: ${reason.factors.time}`,
      });
    }
    if (reason.factors.weather !== undefined) {
      factorsArray.push({
        factor: "Weather",
        score: reason.factors.weather,
        reasoning: `Weather score: ${reason.factors.weather}`,
      });
    }
    if (reason.factors.groupFit !== undefined) {
      factorsArray.push({
        factor: "Group Fit",
        score: reason.factors.groupFit,
        reasoning: `Group fit score: ${reason.factors.groupFit}`,
      });
    }
  }

  return {
    primaryReason: reason.primaryReason,
    factors: factorsArray.length > 0 ? factorsArray : undefined,
    alternativesConsidered: reason.alternativesConsidered,
  };
};

const mapTripActivityToItineraryActivity = (
  activity: TripActivity,
): Extract<ItineraryActivity, { kind: "place" }> => {
  const location = activity.location;
  return {
    kind: "place",
    id: activity.id,
    title: location?.name ?? activity.locationId,
    timeOfDay: activity.timeSlot,
    durationMin: activity.duration,
    locationId: activity.locationId,
    neighborhood: undefined, // Location type doesn't have neighborhood property
    tags: undefined, // Location type doesn't have tags property
    notes: activity.reasoning?.primaryReason,
    recommendationReason: convertRecommendationReason(activity.reasoning),
    schedule:
      activity.startTime && activity.endTime
        ? {
            arrivalTime: activity.startTime,
            departureTime: activity.endTime,
          }
        : undefined,
    mealType: activity.mealType === "snack" ? undefined : activity.mealType,
  };
};

const mapTripDayToItineraryDay = (day: TripDay): ItineraryDay => ({
  id: day.id,
  dateLabel: day.date,
  cityId: day.cityId,
  activities: day.activities.map(mapTripActivityToItineraryActivity),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is the simple stub format (trip domain model)
    if (body.trip && body.refinementType) {
      const { trip, refinementType, dayIndex } = body as RefineRequestBody;

      if (!trip || !refinementType) {
        return NextResponse.json(
          { error: "Missing trip or refinementType" },
          { status: 400 }
        );
      }

      if (!VALID_REFINEMENT_TYPES.includes(refinementType)) {
        return badRequest(`Invalid refinement type: ${refinementType}`);
      }

      // Default to day 0 if dayIndex not provided
      const targetDayIndex = dayIndex ?? 0;

      if (!trip.days[targetDayIndex]) {
        return badRequest(`Day index ${targetDayIndex} not found in trip`);
      }

      // Perform actual refinement using refineDay function
      const refinedDay = refineDay({
        trip,
        dayIndex: targetDayIndex,
        type: refinementType,
      });

      // Update the trip with the refined day
      const updatedDays = trip.days.map((day, index) =>
        index === targetDayIndex ? refinedDay : day
      );

      const refined: Trip = {
        ...trip,
        days: updatedDays,
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json(
        {
          trip: refined,
          refinementType,
          dayIndex: targetDayIndex,
          message: `Successfully refined day ${targetDayIndex + 1} with ${refinementType} refinement.`,
        },
        { status: 200 }
      );
    }

    // Legacy format (for backward compatibility)
    const { tripId, dayIndex, refinementType, builderData, itinerary } = body as RefinementRequest;

    if (!tripId || typeof dayIndex !== "number" || !refinementType) {
      return badRequest("tripId, dayIndex, and refinementType are required");
    }
    if (!VALID_REFINEMENT_TYPES.includes(refinementType)) {
      return badRequest(`Invalid refinement type: ${refinementType}`);
    }
    if (!builderData || !itinerary || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
      return badRequest("builderData and itinerary are required to refine a trip");
    }

    const trip = convertItineraryToTrip(itinerary, builderData, tripId);
    if (!trip.days[dayIndex]) {
      return badRequest(`Day index ${dayIndex} not found for trip ${tripId}`);
    }

    const refinedDay = refineDay({ trip, dayIndex, type: refinementType });
    const updatedDays = trip.days.map((day, index) => (index === dayIndex ? refinedDay : day));
    const updatedTrip: Trip = {
      ...trip,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    };

    const responseBody: RefinementResponse = {
      refinedDay: mapTripDayToItineraryDay(refinedDay),
      updatedTrip,
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    logger.error(
      "Error refining itinerary day",
      error instanceof Error ? error : new Error(String(error)),
    );
    return internalError("Failed to refine day");
  }
}
