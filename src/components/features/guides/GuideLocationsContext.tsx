"use client";

import { createContext, useContext, useMemo } from "react";
import type { Location } from "@/types/location";

type GuideLocationsContextType = {
  locations: Location[];
  getLocationById: (id: string) => Location | undefined;
  /** Tracks rendering order for alternating layout */
  nextIndex: () => number;
  /** Opens the slide-out detail panel for a location */
  onSelectLocation: (location: Location) => void;
};

const GuideLocationsContext = createContext<GuideLocationsContextType>({
  locations: [],
  getLocationById: () => undefined,
  nextIndex: () => 0,
  onSelectLocation: () => {},
});

export function GuideLocationsProvider({
  locations,
  onSelectLocation,
  children,
}: {
  locations: Location[];
  onSelectLocation: (location: Location) => void;
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
      onSelectLocation,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, onSelectLocation]);

  return (
    <GuideLocationsContext.Provider value={value}>
      {children}
    </GuideLocationsContext.Provider>
  );
}

export function useGuideLocations() {
  return useContext(GuideLocationsContext);
}
