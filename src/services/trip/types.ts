/**
 * Types for trip management operations
 */

import type { Itinerary, ItineraryEdit } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

export type StoredTrip = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  itinerary: Itinerary;
  builderData: TripBuilderData;
};

export type CreateTripInput = {
  name: string;
  itinerary: Itinerary;
  builderData: TripBuilderData;
};

export type EditHistoryState = {
  editHistory: Record<string, ItineraryEdit[]>;
  currentHistoryIndex: Record<string, number>;
};
