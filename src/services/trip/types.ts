/**
 * Types for trip management operations
 */

import type { Itinerary, ItineraryEdit } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { GeneratedGuide } from "@/types/llmConstraints";

export type StoredTrip = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  itinerary: Itinerary;
  builderData: TripBuilderData;
  dayIntros?: Record<string, string>;
  guideProse?: GeneratedGuide;
};

export type CreateTripInput = {
  name: string;
  itinerary: Itinerary;
  builderData: TripBuilderData;
  dayIntros?: Record<string, string>;
  guideProse?: GeneratedGuide;
};

export type EditHistoryState = {
  editHistory: Record<string, ItineraryEdit[]>;
  currentHistoryIndex: Record<string, number>;
};
