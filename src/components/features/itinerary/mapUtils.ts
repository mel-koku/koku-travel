import type { ItineraryTravelMode } from "@/types/itinerary";

export const formatDuration = (minutes?: number): string | null => {
  if (!minutes || minutes <= 0) {
    return null;
  }
  if (minutes >= 120) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours}h ${remainder}m`;
  }
  return `${minutes} min`;
};

export const formatDistance = (meters?: number): string | null => {
  if (!meters || meters <= 0) {
    return null;
  }
  if (meters >= 1000) {
    const kilometers = meters / 1000;
    return kilometers >= 10
      ? `${Math.round(kilometers)} km`
      : `${(Math.round(kilometers * 10) / 10).toFixed(1)} km`;
  }
  return `${Math.ceil(meters)} meters`;
};

export const formatModeLabel = (mode: ItineraryTravelMode): string => {
  switch (mode) {
    case "walk":
      return "Walk";
    case "transit":
      return "Public transit";
    case "train":
      return "Train";
    case "subway":
      return "Subway";
    case "bus":
      return "Bus";
    case "tram":
      return "Tram";
    case "ferry":
      return "Ferry";
    case "bicycle":
      return "Bike";
    case "car":
      return "Car";
    case "taxi":
      return "Taxi";
    case "rideshare":
      return "Rideshare";
    default:
      return mode;
  }
};

