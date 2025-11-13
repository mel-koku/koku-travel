import { useSyncExternalStore } from "react";

import type { LocationDetails } from "@/types/location";

type Listener = () => void;

const detailsStore = new Map<string, LocationDetails>();
const detailsListeners = new Map<string, Set<Listener>>();

function notify(locationId: string) {
  const listeners = detailsListeners.get(locationId);
  if (!listeners) {
    return;
  }
  listeners.forEach((listener) => listener());
}

export function cacheLocationDetails(locationId: string, details: LocationDetails) {
  detailsStore.set(locationId, details);
  notify(locationId);
}

export function getCachedLocationDetails(locationId: string): LocationDetails | null {
  return detailsStore.get(locationId) ?? null;
}

export function subscribeToLocationDetails(locationId: string, listener: Listener): () => void {
  let listeners = detailsListeners.get(locationId);
  if (!listeners) {
    listeners = new Set();
    detailsListeners.set(locationId, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners?.delete(listener);
    if (listeners && listeners.size === 0) {
      detailsListeners.delete(locationId);
    }
  };
}

export function useLocationEditorialSummary(locationId: string | null | undefined): string | null {
  return useSyncExternalStore(
    (listener) => {
      if (!locationId) {
        return () => {};
      }
      return subscribeToLocationDetails(locationId, listener);
    },
    () => {
      if (!locationId) {
        return null;
      }
      return getCachedLocationDetails(locationId)?.editorialSummary ?? null;
    },
    () => null,
  );
}


