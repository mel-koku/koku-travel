import type { AddressResult, AddressSuggestion } from "./types";
import type { LocationOperatingHours, Weekday } from "@/types/location";

const WEEKDAYS: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function parseGoogleHours(raw: unknown): LocationOperatingHours | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const periods = (raw as { periods?: Array<unknown> }).periods;
  if (!Array.isArray(periods) || periods.length === 0) return undefined;

  const parsed = periods
    .map((p) => {
      const obj = p as {
        open?: { day?: number; hour?: number; minute?: number };
        close?: { day?: number; hour?: number; minute?: number };
      };
      if (!obj.open || typeof obj.open.day !== "number") return null;
      const open = `${pad(obj.open.hour ?? 0)}:${pad(obj.open.minute ?? 0)}`;
      const close = obj.close
        ? `${pad(obj.close.hour ?? 0)}:${pad(obj.close.minute ?? 0)}`
        : "23:59";
      return { day: WEEKDAYS[obj.open.day], open, close };
    })
    .filter((p): p is { day: Weekday; open: string; close: string } => p !== null);

  if (parsed.length === 0) return undefined;
  return { timezone: "Asia/Tokyo", periods: parsed };
}

export async function googleSearch(
  query: string,
  sessionToken: string,
  apiKey: string,
): Promise<AddressSuggestion[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      input: query,
      sessionToken,
      includedRegionCodes: ["jp"],
    }),
  });
  if (!res.ok) throw new Error(`Google autocomplete failed: ${res.status}`);
  const body = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string;
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  };
  return (body.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
    .map((p) => ({
      id: p.placeId!,
      title: p.structuredFormat?.mainText?.text ?? "",
      subtitle: p.structuredFormat?.secondaryText?.text,
    }));
}

export async function googleRetrieve(
  placeId: string,
  sessionToken: string,
  apiKey: string,
): Promise<AddressResult> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "displayName,formattedAddress,location,regularOpeningHours",
      "X-Goog-Session-Token": sessionToken,
    },
  });
  if (!res.ok) throw new Error(`Google place details failed: ${res.status}`);
  const body = (await res.json()) as {
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    regularOpeningHours?: unknown;
  };
  if (!body.location?.latitude || !body.location?.longitude) {
    throw new Error("Google place details returned no location");
  }
  return {
    title: body.displayName?.text ?? "",
    address: body.formattedAddress ?? "",
    coordinates: { lat: body.location.latitude, lng: body.location.longitude },
    openingHours: parseGoogleHours(body.regularOpeningHours),
    source: "google",
  };
}
