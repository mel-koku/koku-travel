"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { getLocal, setLocal } from "@/lib/storageHelpers";
import type { EntryPoint, InterestId, TripBuilderData, TripStyle } from "@/types/trip";
import { INTEREST_CATEGORIES } from "@/data/interests";
import { getEntryPointById } from "@/data/entryPoints";

type TripBuilderContextValue = {
  data: TripBuilderData;
  setData: React.Dispatch<React.SetStateAction<TripBuilderData>>;
  reset: () => void;
};

const STORAGE_KEY = "koku_trip_builder";

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
  return {
    ...base,
    ...raw,
    dates: {
      ...base.dates,
      ...raw.dates,
    },
    regions: raw.regions ?? base.regions,
    cities: raw.cities ?? base.cities,
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

  useEffect(() => {
    if (isHydrated.current) {
      return;
    }
    const stored = getLocal<TripBuilderData>(STORAGE_KEY);
    if (stored) {
      const normalizedStored = normalizeData(stored);
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    setLocal(STORAGE_KEY, normalizeData(data));
  }, [data]);

  const reset = useCallback(() => {
    const next = createDefaultData();
    setData(next);
    setLocal(STORAGE_KEY, next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("koku_trip_step");
      } catch {
        // Ignore storage errors to avoid interrupting reset.
      }
    }
  }, []);

  const value: TripBuilderContextValue = {
    data,
    setData,
    reset,
  };

  return <TripBuilderContext.Provider value={value}>{children}</TripBuilderContext.Provider>;
}

export function useTripBuilder() {
  const context = useContext(TripBuilderContext);
  if (!context) {
    throw new Error("useTripBuilder must be used within a TripBuilderProvider");
  }
  return context;
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
  const notes = typeof accessibility.notes === "string" ? accessibility.notes.trim() : "";

  if (!hasMobility && dietary.length === 0 && notes.length === 0) {
    return undefined;
  }

  const sanitized: TripBuilderData["accessibility"] = {
    dietary,
  };

  if (hasMobility) {
    sanitized.mobility = true;
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
  if (entryPoint.type !== "airport" && entryPoint.type !== "city" && entryPoint.type !== "hotel") {
    return undefined;
  }

  // Try to get the entry point from our data to ensure it's valid
  const validEntryPoint = getEntryPointById(entryPoint.id);
  if (validEntryPoint) {
    return validEntryPoint;
  }

  // If not found in our data but structure is valid, return as-is (for custom hotels, etc.)
  return {
    type: entryPoint.type,
    id: String(entryPoint.id).trim(),
    name: String(entryPoint.name).trim(),
    coordinates: {
      lat: Number(entryPoint.coordinates.lat),
      lng: Number(entryPoint.coordinates.lng),
    },
    cityId: entryPoint.cityId,
  };
}


