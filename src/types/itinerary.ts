export type ActivityKind = "place" | "note";

export type ItineraryTime = {
  startTime?: string;
  endTime?: string;
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
  activities: ItineraryActivity[];
};

export type Itinerary = {
  days: ItineraryDay[];
};


