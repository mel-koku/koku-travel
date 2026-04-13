"use client";

import { createContext, useContext } from "react";
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
  // Counter must reset to 0 at the start of every render so that the
  // first LocationBreakoutCard lays out as "left", second as "right",
  // etc. Previously a `let counter = 0` declaration outside useMemo
  // combined with the memo cache produced a stale closure that kept
  // incrementing across renders — a re-render of GuideContent flipped
  // every card's left/right layout instead of preserving order.
  //
  // Recreating value each render is fine here: the provider only renders
  // when its props (locations, onSelectLocation) change anyway, so the
  // context-driven re-render cost matches what useMemo achieved.
  let counter = 0;
  const map = new Map<string, Location>();
  for (const loc of locations) {
    map.set(loc.id, loc);
  }
  const value: GuideLocationsContextType = {
    locations,
    getLocationById: (id: string) => map.get(id),
    nextIndex: () => counter++,
    onSelectLocation,
  };

  return (
    <GuideLocationsContext.Provider value={value}>
      {children}
    </GuideLocationsContext.Provider>
  );
}

export function useGuideLocations() {
  return useContext(GuideLocationsContext);
}
