/**
 * Legacy location details store using useSyncExternalStore
 *
 * @deprecated This module is deprecated and will be removed in v2.0.
 * Use `useLocationDetailsQuery` from `@/hooks/useLocationDetailsQuery` instead.
 *
 * The React Query-based hook provides:
 * - Automatic caching with configurable TTL
 * - Background refetching
 * - Better integration with the rest of the app
 *
 * Migration example:
 * ```tsx
 * // Before (deprecated)
 * import { useLocationEditorialSummary } from "@/state/locationDetailsStore";
 * const summary = useLocationEditorialSummary(locationId);
 *
 * // After (recommended)
 * import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
 * const { data: details } = useLocationDetailsQuery(locationId);
 * const summary = details?.editorialSummary;
 * ```
 */

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

/**
 * @deprecated Use React Query cache instead - will be removed in v2.0
 */
export function cacheLocationDetails(locationId: string, details: LocationDetails) {
  detailsStore.set(locationId, details);
  notify(locationId);
}

/**
 * @deprecated Use `useLocationDetailsQuery` hook instead - will be removed in v2.0
 */
export function getCachedLocationDetails(locationId: string): LocationDetails | null {
  return detailsStore.get(locationId) ?? null;
}

/**
 * @deprecated Use `useLocationDetailsQuery` hook instead - will be removed in v2.0
 */
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

/**
 * @deprecated Use `useLocationDetailsQuery` hook instead - will be removed in v2.0
 * @example
 * // Instead of:
 * const summary = useLocationEditorialSummary(locationId);
 * // Use:
 * const { data } = useLocationDetailsQuery(locationId);
 * const summary = data?.editorialSummary;
 */
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

/**
 * @deprecated Use `useLocationDetailsQuery` hook instead - will be removed in v2.0
 * @example
 * // Instead of:
 * const name = useLocationDisplayName(locationId);
 * // Use:
 * const { data } = useLocationDetailsQuery(locationId);
 * const name = data?.displayName;
 */
export function useLocationDisplayName(locationId: string | null | undefined): string | null {
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
      return getCachedLocationDetails(locationId)?.displayName ?? null;
    },
    () => null,
  );
}


