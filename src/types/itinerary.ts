import type { LocationTransitMode } from "./location";

export type ActivityKind = "place" | "note";

/**
 * Recommendation reason explaining why a location was selected.
 * 
 * Note: A similar RecommendationReason exists in tripDomain.ts with structured scoring factors.
 * This version is more flexible and used in itinerary editing contexts.
 */
export type RecommendationReason = {
  /**
   * Primary reason for the recommendation
   */
  primaryReason: string;
  /**
   * Breakdown of scoring factors
   */
  factors?: Array<{
    factor: string;
    score: number;
    reasoning: string;
  }>;
  /**
   * Alternative locations that were considered
   */
  alternativesConsidered?: string[];
};

export type ItineraryTime = {
  startTime?: string;
  endTime?: string;
  timezone?: string;
};

export type ItineraryOperatingWindow = {
  opensAt: string;
  closesAt: string;
  note?: string;
  status?: "within" | "outside" | "unknown";
};

export type ItineraryScheduledVisit = {
  /**
   * Planned arrival time in local day timezone (HH:MM).
   */
  arrivalTime: string;
  /**
   * Planned departure time in local day timezone (HH:MM).
   */
  departureTime: string;
  /**
   * Optional buffer (minutes) added before opening or after closing.
   */
  arrivalBufferMinutes?: number;
  departureBufferMinutes?: number;
  /**
   * Operating window this visit was aligned against.
   */
  operatingWindow?: ItineraryOperatingWindow;
  /**
   * Execution confidence for the scheduled time.
   */
  status?: "scheduled" | "tentative" | "out-of-hours" | "closed";
};

export type ItineraryTravelMode = LocationTransitMode | "transit" | "rideshare";

export type TransitStep = {
  type: "walk" | "transit";
  /** Walk duration in minutes */
  walkMinutes?: number;
  /** Walk instruction, e.g. "Walk to Shibuya Station" */
  walkInstruction?: string;
  /** Transit line name, e.g. "JR Yamanote Line" */
  lineName?: string;
  /** Short line name, e.g. "Yamanote" */
  lineShortName?: string;
  /** Vehicle type from Google, e.g. "HEAVY_RAIL", "SUBWAY" */
  vehicleType?: string;
  /** Departure stop name, e.g. "Shibuya" */
  departureStop?: string;
  /** Arrival stop name, e.g. "Harajuku" */
  arrivalStop?: string;
  /** Headsign, e.g. "toward Shinjuku" */
  headsign?: string;
  /** Number of stops */
  numStops?: number;
  /** Duration in minutes for this step */
  durationMinutes?: number;
};

export type ItineraryTravelSegment = {
  mode: ItineraryTravelMode;
  durationMinutes: number;
  distanceMeters?: number;
  departureTime?: string;
  arrivalTime?: string;
  instructions?: string[];
  notes?: string;
  path?: Array<{ lat: number; lng: number }>;
  /** True if this is a heuristic estimate (not from real routing API) */
  isEstimated?: boolean;
  /** Structured transit steps (walk + transit legs) from Google Directions */
  transitSteps?: TransitStep[];
};

export type ItineraryCityTransition = {
  fromCityId: string;
  toCityId: string;
  mode: ItineraryTravelMode;
  durationMinutes: number;
  distanceMeters?: number;
  departureTime?: string;
  arrivalTime?: string;
  notes?: string;
};

/**
 * A single activity in an itinerary day.
 *
 * This is the **canonical activity type** used throughout the itinerary system —
 * rendering, editing, undo/redo, smart prompts, and persistence.
 *
 * Contrast with `TripActivity` in tripDomain.ts, which is the planning-phase
 * representation used during initial generation (has `location?: Location` and
 * structured scoring factors). Once a trip is generated, activities are stored
 * as `ItineraryActivity`.
 */
export type ItineraryActivity =
  | {
      kind: "place";
      id: string;
      title: string;
      timeOfDay: "morning" | "afternoon" | "evening";
      durationMin?: number;
      neighborhood?: string;
      tags?: string[];
      notes?: string;
      /**
       * Optional reference to a canonical location entry.
       */
      locationId?: string;
      /**
       * Optional embedded coordinates (for entry points or external places).
       */
      coordinates?: { lat: number; lng: number };
      /**
       * Short description of the place (from location data).
       */
      description?: string;
      /**
       * Meal type if this is a meal activity (breakfast, lunch, dinner, snack)
       */
      mealType?: "breakfast" | "lunch" | "dinner" | "snack";
      /**
       * Recommendation reason explaining why this location was selected
       */
      recommendationReason?: RecommendationReason;
      /**
       * Finalized schedule for this visit.
       */
      schedule?: ItineraryScheduledVisit;
      /**
       * Travel segment connecting from the previous activity to this one.
       */
      travelFromPrevious?: ItineraryTravelSegment;
      /**
       * Travel segment leading from this activity to the next one.
       */
      travelToNext?: ItineraryTravelSegment;
      /**
       * Annotated opening hours relevant to this visit.
       */
      operatingWindow?: ItineraryOperatingWindow;
      /**
       * Real-time availability status for this location
       */
      availabilityStatus?: import("./availability").AvailabilityStatus;
      /**
       * Availability information message
       */
      availabilityMessage?: string;
      /**
       * User-specified manual start time (HH:MM format).
       * When set, overrides auto-calculated arrival time.
       */
      manualStartTime?: string;
    }
  | {
      kind: "note";
      id: string;
      title: "Note";
      timeOfDay: "morning" | "afternoon" | "evening";
      notes: string;
      startTime?: string;
      endTime?: string;
    };

export type ItineraryDay = {
  /**
   * Unique identifier for this day (used for editing and state management).
   */
  id: string;
  dateLabel?: string;
  /**
   * Local timezone for the day's schedule (defaults to itinerary timezone).
   */
  timezone?: string;
  /**
   * Optional day-wide timing window.
   */
  bounds?: ItineraryTime;
  /**
   * Optional weekday reference used for operating hour lookups.
   */
  weekday?: import("./location").Weekday;
  /**
   * Primary city for this day.
   */
  cityId?: import("./trip").CityId;
  /**
   * Inter-city travel segment if transitioning from previous day's city.
   */
  cityTransition?: ItineraryCityTransition;
  activities: ItineraryActivity[];
  /**
   * Whether this day is a day trip from the base city.
   */
  isDayTrip?: boolean;
  /**
   * The base city ID if this is a day trip.
   */
  baseCityId?: import("./trip").CityId;
  /**
   * One-way travel time in minutes for day trips.
   */
  dayTripTravelMinutes?: number;
};

export type Itinerary = {
  days: ItineraryDay[];
  /**
   * Default timezone for the entire itinerary.
   */
  timezone?: string;
};

/**
 * Represents a single edit operation on an itinerary.
 * Used for tracking edit history for undo/redo functionality.
 */
export type ItineraryEdit = {
  id: string;
  tripId: string;
  timestamp: string;
  type:
    | "setDayEntryPoint"
    | "replaceActivity"
    | "deleteActivity"
    | "reorderActivities"
    | "addActivity";
  dayId: string;
  /**
   * Snapshot of the itinerary state before this edit.
   */
  previousItinerary: Itinerary;
  /**
   * Snapshot of the itinerary state after this edit.
   */
  nextItinerary: Itinerary;
  /**
   * Additional metadata specific to the edit type.
   */
  metadata?: Record<string, unknown>;
};


