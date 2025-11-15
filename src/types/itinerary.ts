import type { LocationTransitMode } from "./location";

export type ActivityKind = "place" | "note";

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
  status?: "scheduled" | "tentative" | "out-of-hours";
};

export type ItineraryTravelMode = LocationTransitMode | "transit" | "rideshare";

export type ItineraryTravelSegment = {
  mode: ItineraryTravelMode;
  durationMinutes: number;
  distanceMeters?: number;
  departureTime?: string;
  arrivalTime?: string;
  instructions?: string[];
  notes?: string;
  path?: Array<{ lat: number; lng: number }>;
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
};

export type Itinerary = {
  days: ItineraryDay[];
  /**
   * Default timezone for the entire itinerary.
   */
  timezone?: string;
};


