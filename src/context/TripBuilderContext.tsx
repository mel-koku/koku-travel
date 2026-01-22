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
import type { CityId, EntryPoint, InterestId, RegionId, TripBuilderData, TripStyle } from "@/types/trip";
import { INTEREST_CATEGORIES } from "@/data/interests";
import { getEntryPointById } from "@/data/entryPoints";

type TripBuilderContextValue = {
  data: TripBuilderData;
  setData: React.Dispatch<React.SetStateAction<TripBuilderData>>;
  reset: () => void;
};

const MAX_INTEREST_SELECTION = 5;
const VALID_INTERESTS = new Set<InterestId>(INTEREST_CATEGORIES.map((category) => category.id));

const createDefaultData = (): TripBuilderData => ({
  dates: {},
  regions: [],
  cities: [],
  interests: [],
  style: undefined,
  entryPoint: undefined,
  accessibility: undefined,
});

const normalizeData = (raw?: TripBuilderData): TripBuilderData => {
  const base = createDefaultData();
  if (!raw) {
    return base;
  }
  const normalizedInterests = sanitizeInterests(raw.interests);
  const normalizedStyle = sanitizeStyle(raw.style);
  const normalizedAccessibility = sanitizeAccessibility(raw.accessibility);
  const normalizedEntryPoint = sanitizeEntryPoint(raw.entryPoint);
  const normalizedRegions = sanitizeRegions(raw.regions);
  const normalizedCities = sanitizeCities(raw.cities);
  return {
    ...base,
    ...raw,
    dates: {
      ...base.dates,
      ...raw.dates,
    },
    regions: normalizedRegions,
    cities: normalizedCities,
    interests: normalizedInterests,
    style: normalizedStyle,
    entryPoint: normalizedEntryPoint,
    accessibility: normalizedAccessibility,
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
          regions: normalizedStored.regions,
          cities: normalizedStored.cities,
          interests: normalizedStored.interests,
          style: normalizedStored.style,
          entryPoint: normalizedStored.entryPoint,
          accessibility: normalizedStored.accessibility,
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

    // Cleanup timeout on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
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

function sanitizeInterests(interests?: InterestId[]): InterestId[] {
  if (!interests || interests.length === 0) {
    return [];
  }
  const next: InterestId[] = [];
  for (const interest of interests) {
    if (!VALID_INTERESTS.has(interest)) {
      continue;
    }
    if (next.includes(interest)) {
      continue;
    }
    next.push(interest);
    if (next.length >= MAX_INTEREST_SELECTION) {
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

  // Validate type
  if (entryPoint.type !== "airport" && entryPoint.type !== "city" && entryPoint.type !== "hotel" && entryPoint.type !== "station") {
    return undefined;
  }

  // Try to get the entry point from our data to ensure it's valid
  const validEntryPoint = getEntryPointById(entryPoint.id);
  if (validEntryPoint) {
    return validEntryPoint;
  }

  // If not found in our data but structure is valid, return as-is (for custom hotels, etc.)
  // Validate coordinate bounds to prevent invalid entry points
  const lat = Number(entryPoint.coordinates.lat);
  const lng = Number(entryPoint.coordinates.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return undefined;
  }

  return {
    type: entryPoint.type,
    id: String(entryPoint.id).trim(),
    name: String(entryPoint.name).trim(),
    coordinates: {
      lat,
      lng,
    },
    cityId: entryPoint.cityId,
  };
}


