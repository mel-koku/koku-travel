/**
 * Types for trip management operations
 */

import type { Itinerary, ItineraryEdit } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { GeneratedGuide, GeneratedBriefings } from "@/types/llmConstraints";
import type { CulturalBriefing } from "@/types/culturalBriefing";

export type StoredTrip = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  itinerary: Itinerary;
  builderData: TripBuilderData;
  dayIntros?: Record<string, string>;
  guideProse?: GeneratedGuide;
  dailyBriefings?: GeneratedBriefings;
  culturalBriefing?: CulturalBriefing;
};

export type CreateTripInput = {
  name: string;
  itinerary: Itinerary;
  builderData: TripBuilderData;
  dayIntros?: Record<string, string>;
  guideProse?: GeneratedGuide;
  dailyBriefings?: GeneratedBriefings;
  culturalBriefing?: CulturalBriefing;
};

export type EditHistoryState = {
  editHistory: Record<string, ItineraryEdit[]>;
  currentHistoryIndex: Record<string, number>;
};
