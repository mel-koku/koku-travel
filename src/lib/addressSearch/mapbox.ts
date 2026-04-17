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

function parseMapboxTime(t: string): string {
  // "1100" → "11:00"
  if (t.length !== 4) return t;
  return `${t.slice(0, 2)}:${t.slice(2)}`;
}

function parseMapboxOpenHours(raw: unknown): LocationOperatingHours | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const periods = (raw as { periods?: Array<unknown> }).periods;
  if (!Array.isArray(periods) || periods.length === 0) return undefined;

  const parsed = periods
    .map((p) => {
      const obj = p as { open?: { day?: number; time?: string }; close?: { day?: number; time?: string } };
      if (!obj.open || typeof obj.open.day !== "number" || !obj.open.time) return null;
      return {
        day: WEEKDAYS[obj.open.day],
        open: parseMapboxTime(obj.open.time),
        close: obj.close?.time ? parseMapboxTime(obj.close.time) : "23:59",
      };
    })
    .filter((p): p is { day: Weekday; open: string; close: string } => p !== null);

  if (parsed.length === 0) return undefined;
  return { timezone: "Asia/Tokyo", periods: parsed };
}

export async function mapboxSuggest(
  query: string,
  sessionToken: string,
  accessToken: string,
): Promise<AddressSuggestion[]> {
  const url = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");
  url.searchParams.set("q", query);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("session_token", sessionToken);
  url.searchParams.set("country", "jp");
  url.searchParams.set("limit", "8");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Mapbox suggest failed: ${res.status}`);
  const body = (await res.json()) as { suggestions?: Array<{ mapbox_id?: string; name?: string; place_formatted?: string }> };
  return (body.suggestions ?? []).map((s) => ({
    id: s.mapbox_id ?? "",
    title: s.name ?? "",
    subtitle: s.place_formatted,
  }));
}

export async function mapboxRetrieve(
  id: string,
  sessionToken: string,
  accessToken: string,
): Promise<AddressResult> {
  const url = new URL(`https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(id)}`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("session_token", sessionToken);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Mapbox retrieve failed: ${res.status}`);
  const body = (await res.json()) as {
    features?: Array<{
      properties?: {
        name?: string;
        full_address?: string;
        coordinates?: { longitude: number; latitude: number };
        metadata?: { open_hours?: unknown };
      };
    }>;
  };
  const first = body.features?.[0]?.properties;
  if (!first?.coordinates) throw new Error("Mapbox retrieve returned no coordinates");

  return {
    title: first.name ?? "",
    address: first.full_address ?? "",
    coordinates: { lat: first.coordinates.latitude, lng: first.coordinates.longitude },
    openingHours: parseMapboxOpenHours(first.metadata?.open_hours),
    source: "mapbox",
  };
}
