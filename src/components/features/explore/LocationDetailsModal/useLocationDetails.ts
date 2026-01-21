/**
 * Hook for fetching location details
 *
 * This is now a wrapper around useLocationDetailsQuery for backwards compatibility.
 * New code should use useLocationDetailsQuery directly from @/hooks/useLocationDetailsQuery
 */

import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";

export function useLocationDetails(locationId: string | null) {
  return useLocationDetailsQuery(locationId);
}
