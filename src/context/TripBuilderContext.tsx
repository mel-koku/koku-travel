"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getLocal, setLocal } from "@/lib/storageHelpers";
import { TRIP_BUILDER_STORAGE_KEY, APP_STATE_DEBOUNCE_MS } from "@/lib/constants";
import type { CityId, EntryPoint, RegionId, TripBuilderData, TripStyle, VibeId } from "@/types/trip";
import { VALID_VIBE_IDS } from "@/types/trip";
import { vibesToInterests, MAX_VIBE_SELECTION } from "@/data/vibes";

type TripBuilderContextValue = {
  data: TripBuilderData;
  setData: React.Dispatch<React.SetStateAction<TripBuilderData>>;
  reset: () => void;
};


const createDefaultData = (): TripBuilderData => ({
  dates: {},
  vibes: [],
  regions: [],
  cities: [],
  interests: [],
  style: undefined,
  entryPoint: undefined,
  accessibility: undefined,
  dayStartTime: undefined,
});

const normalizeData = (raw?: TripBuilderData): TripBuilderData => {
  const base = createDefaultData();
  if (!raw) {
    return base;
  }
  const normalizedVibes = sanitizeVibes(raw.vibes);
  // Derive interests from vibes automatically for backward compatibility
  const derivedInterests = vibesToInterests(normalizedVibes);
  const normalizedStyle = sanitizeStyle(raw.style);
  const normalizedAccessibility = sanitizeAccessibility(raw.accessibility);
  const normalizedEntryPoint = sanitizeEntryPoint(raw.entryPoint);
  const normalizedRegions = sanitizeRegions(raw.regions);
  const normalizedCities = sanitizeCities(raw.cities);
  const normalizedDayStartTime = sanitizeDayStartTime(raw.dayStartTime);
  // Only include known TripBuilderData fields — never spread ...raw
  // to prevent stale localStorage keys from reaching .strict() schema validation
  return {
    duration: raw.duration ?? base.duration,
    dates: {
      start: raw.dates?.start ?? base.dates?.start,
      end: raw.dates?.end ?? base.dates?.end,
    },
    vibes: normalizedVibes,
    regions: normalizedRegions,
    cities: normalizedCities,
    interests: derivedInterests,
    style: normalizedStyle,
    entryPoint: normalizedEntryPoint,
    accessibility: normalizedAccessibility,
    budget: raw.budget ?? base.budget,
    group: raw.group ?? base.group,
    weatherPreferences: raw.weatherPreferences ?? base.weatherPreferences,
    travelerProfile: raw.travelerProfile ?? base.travelerProfile,
    dayStartTime: normalizedDayStartTime,
    isFirstTimeVisitor: raw.isFirstTimeVisitor === true ? true : undefined,
  };
};

const TripBuilderContext = createContext<TripBuilderContextValue | undefined>(undefined);

export type TripBuilderProviderProps = {
  /**
   * Optional initial state for the wizard. Typically sourced from the server.
   */
  initialData?: TripBuilderData;
  children: ReactNode;
};

export function TripBuilderProvider({ initialData, children }: TripBuilderProviderProps) {
  const [data, setData] = useState<TripBuilderData>(() => normalizeData(initialData));
  const isHydrated = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce delay for localStorage writes
  const DEBOUNCE_DELAY_MS = APP_STATE_DEBOUNCE_MS;

  useEffect(() => {
    if (isHydrated.current) {
      return;
    }
    const stored = getLocal<TripBuilderData>(TRIP_BUILDER_STORAGE_KEY);
    if (stored) {
      const normalizedStored = normalizeData(stored);
      setData((prev) => {
        const normalizedPrev = normalizeData(prev);
        return {
          ...normalizedPrev,
          ...normalizedStored,
          dates: {
            ...normalizedPrev.dates,
            ...normalizedStored.dates,
          },
          vibes: normalizedStored.vibes,
          regions: normalizedStored.regions,
          cities: normalizedStored.cities,
          interests: normalizedStored.interests,
          style: normalizedStored.style,
          entryPoint: normalizedStored.entryPoint,
          accessibility: normalizedStored.accessibility,
          dayStartTime: normalizedStored.dayStartTime,
        };
      });
    }
    isHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!isHydrated.current) {
      return;
    }

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced write
    debounceTimeoutRef.current = setTimeout(() => {
      setLocal(TRIP_BUILDER_STORAGE_KEY, normalizeData(data));
      debounceTimeoutRef.current = null;
    }, DEBOUNCE_DELAY_MS);

    // Flush pending write on unmount so data isn't lost
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        setLocal(TRIP_BUILDER_STORAGE_KEY, normalizeData(data));
        debounceTimeoutRef.current = null;
      }
    };
  }, [data, DEBOUNCE_DELAY_MS]);

  const reset = useCallback(() => {
    const next = createDefaultData();
    setData(next);
    setLocal(TRIP_BUILDER_STORAGE_KEY, next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("koku_trip_step");
      } catch {
        // Ignore storage errors to avoid interrupting reset.
      }
    }
  }, []);

  // Reset in-memory state when AppState clears all local data
  useEffect(() => {
    const handleClear = () => reset();
    window.addEventListener("koku:local-data-cleared", handleClear);
    return () => window.removeEventListener("koku:local-data-cleared", handleClear);
  }, [reset]);

  const setDataNormalized = useCallback(
    (updater: React.SetStateAction<TripBuilderData>) => {
      // Prevent setData calls during hydration to avoid race conditions
      // During hydration, localStorage data may override external changes
      if (!isHydrated.current) {
        return;
      }
      setData((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        return normalizeData(next);
      });
    },
    [],
  );

  const value = useMemo<TripBuilderContextValue>(
    () => ({
      data,
      setData: setDataNormalized,
      reset,
    }),
    [data, setDataNormalized, reset],
  );

  return <TripBuilderContext.Provider value={value}>{children}</TripBuilderContext.Provider>;
}

export function useTripBuilder() {
  const context = useContext(TripBuilderContext);
  if (!context) {
    throw new Error("useTripBuilder must be used within a TripBuilderProvider");
  }
  return context;
}

/**
 * Optional version of useTripBuilder that returns null when outside a TripBuilderProvider.
 * Use this in components that may or may not be within the provider context.
 */
export function useTripBuilderOptional(): TripBuilderContextValue | null {
  return useContext(TripBuilderContext) ?? null;
}

/**
 * Sanitize regions - accepts any string as region ID now that we support dynamic regions
 */
function sanitizeRegions(regions?: RegionId[] | string[]): RegionId[] {
  if (!regions || regions.length === 0) {
    return [];
  }
  const next: RegionId[] = [];
  const seen = new Set<string>();
  for (const region of regions) {
    if (typeof region === "string" && region.trim().length > 0) {
      // Preserve original case to maintain backwards compatibility with existing saved trips
      const regionId = region.trim() as RegionId;
      if (!seen.has(regionId)) {
        seen.add(regionId);
        next.push(regionId);
      }
    }
  }
  return next;
}

/**
 * Sanitize cities - accepts any string as city ID now that we support dynamic cities
 */
function sanitizeCities(cities?: CityId[] | string[]): CityId[] {
  if (!cities || cities.length === 0) {
    return [];
  }
  const next: CityId[] = [];
  const seen = new Set<string>();
  for (const city of cities) {
    if (typeof city === "string" && city.trim().length > 0) {
      const cityId = city.trim();
      if (!seen.has(cityId)) {
        seen.add(cityId);
        next.push(cityId);
      }
    }
  }
  return next;
}

function sanitizeVibes(vibes?: VibeId[]): VibeId[] {
  if (!vibes || vibes.length === 0) {
    return [];
  }
  const next: VibeId[] = [];
  for (const vibe of vibes) {
    if (!VALID_VIBE_IDS.has(vibe)) {
      continue;
    }
    if (next.includes(vibe)) {
      continue;
    }
    next.push(vibe);
    if (next.length >= MAX_VIBE_SELECTION) {
      break;
    }
  }
  return next;
}

function sanitizeStyle(style?: TripStyle): TripStyle | undefined {
  if (!style) {
    return undefined;
  }
  if (style === "relaxed" || style === "balanced" || style === "fast") {
    return style;
  }
  return undefined;
}

function sanitizeAccessibility(
  accessibility?: TripBuilderData["accessibility"],
): TripBuilderData["accessibility"] | undefined {
  if (!accessibility) {
    return undefined;
  }

  const hasMobility = accessibility.mobility === true;
  const dietary = Array.isArray(accessibility.dietary)
    ? Array.from(
        new Set(
          accessibility.dietary
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0),
        ),
      )
    : [];
  const dietaryOtherRaw = typeof accessibility.dietaryOther === "string" ? accessibility.dietaryOther : "";
  const dietaryOther = dietaryOtherRaw.trim();
  const notesRaw = typeof accessibility.notes === "string" ? accessibility.notes : "";
  const notes = notesRaw.trim();

  if (!hasMobility && dietary.length === 0 && dietaryOther.length === 0 && notes.length === 0) {
    return undefined;
  }

  const sanitized: TripBuilderData["accessibility"] = {
    dietary,
  };

  if (hasMobility) {
    sanitized.mobility = true;
  }
  if (dietaryOther.length > 0) {
    sanitized.dietaryOther = dietaryOther;
  }
  if (notes.length > 0) {
    sanitized.notes = notes;
  }

  return sanitized;
}

function sanitizeEntryPoint(entryPoint?: EntryPoint): EntryPoint | undefined {
  if (!entryPoint) {
    return undefined;
  }

  // Validate entry point structure
  if (
    typeof entryPoint !== "object" ||
    !entryPoint.type ||
    !entryPoint.id ||
    !entryPoint.name ||
    !entryPoint.coordinates ||
    typeof entryPoint.coordinates.lat !== "number" ||
    typeof entryPoint.coordinates.lng !== "number"
  ) {
    return undefined;
  }

  // Only accept airport type (city, hotel, station are no longer supported)
  if (entryPoint.type !== "airport") {
    return undefined;
  }

  // Validate coordinate bounds to prevent invalid entry points
  const lat = Number(entryPoint.coordinates.lat);
  const lng = Number(entryPoint.coordinates.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return undefined;
  }

  return {
    type: "airport",
    id: String(entryPoint.id).trim(),
    name: String(entryPoint.name).trim(),
    coordinates: {
      lat,
      lng,
    },
    cityId: entryPoint.cityId,
    iataCode: typeof entryPoint.iataCode === "string" ? entryPoint.iataCode.trim().toUpperCase() : undefined,
    region: entryPoint.region,
  };
}

/**
 * Sanitize day start time - validates HH:MM format (24-hour)
 */
function sanitizeDayStartTime(dayStartTime?: string): string | undefined {
  if (!dayStartTime || typeof dayStartTime !== "string") {
    return undefined;
  }

  // Validate HH:MM format (24-hour)
  const match = dayStartTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return undefined;
  }

  // Normalize to HH:MM format
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}


