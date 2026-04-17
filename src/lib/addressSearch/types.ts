import type { LocationOperatingHours } from "@/types/location";

export type AddressProvider = "mapbox" | "google";

export type AddressSuggestion = {
  id: string;
  title: string;
  subtitle?: string;
};

export type AddressResult = {
  title: string;
  address: string;
  coordinates: { lat: number; lng: number };
  openingHours?: LocationOperatingHours;
  source: AddressProvider;
};

export type AddressSearchAction =
  | { action: "suggest"; query: string; provider: AddressProvider; sessionToken: string }
  | { action: "retrieve"; id: string; provider: AddressProvider; sessionToken: string };
