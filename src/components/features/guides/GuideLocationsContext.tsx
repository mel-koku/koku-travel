"use client";

import { createContext, useContext, useMemo } from "react";
import type { Location } from "@/types/location";

type GuideLocationsContextType = {
  locations: Location[];
  getLocationById: (id: string) => Location | undefined;
  /** Tracks rendering order for alternating layout */
  nextIndex: () => number;
};

const GuideLocationsContext = createContext<GuideLocationsContextType>({
  locations: [],
  getLocationById: () => undefined,
  nextIndex: () => 0,
});

export function GuideLocationsProvider({
  locations,
  children,
}: {
  locations: Location[];
  children: React.ReactNode;
}) {
  let counter = 0;

  const value = useMemo(() => {
    const map = new Map<string, Location>();
    for (const loc of locations) {
      map.set(loc.id, loc);
    }
    return {
      locations,
      getLocationById: (id: string) => map.get(id),
      nextIndex: () => counter++,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

  return (
    <GuideLocationsContext.Provider value={value}>
      {children}
    </GuideLocationsContext.Provider>
  );
}

export function useGuideLocations() {
  return useContext(GuideLocationsContext);
}
