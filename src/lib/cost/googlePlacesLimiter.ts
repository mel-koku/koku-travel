import { logger } from "@/lib/logger";
import { featureFlags } from "@/lib/env/featureFlags";

/**
 * Per-trip Google Places API call limiter
 * Tracks API calls per trip to prevent excessive usage
 */
class GooglePlacesLimiter {
  private tripCallCounts = new Map<string, number>();
  private readonly MAX_CALLS_PER_TRIP = 50;

  /**
   * Check if a trip can make another Google Places API call
   */
  canMakeCall(tripId: string): boolean {
    if (featureFlags.cheapMode) {
      return false;
    }

    if (!featureFlags.enableGooglePlaces) {
      return false;
    }

    const currentCount = this.tripCallCounts.get(tripId) ?? 0;
    return currentCount < this.MAX_CALLS_PER_TRIP;
  }

  /**
   * Record a Google Places API call for a trip
   */
  recordCall(tripId: string): void {
    const currentCount = this.tripCallCounts.get(tripId) ?? 0;
    this.tripCallCounts.set(tripId, currentCount + 1);

    if (currentCount + 1 >= this.MAX_CALLS_PER_TRIP) {
      logger.warn(`Trip ${tripId} has reached the Google Places API call limit (${this.MAX_CALLS_PER_TRIP})`);
    }
  }

  /**
   * Get the current call count for a trip
   */
  getCallCount(tripId: string): number {
    return this.tripCallCounts.get(tripId) ?? 0;
  }

  /**
   * Reset call count for a trip (useful for testing or trip completion)
   */
  resetTrip(tripId: string): void {
    this.tripCallCounts.delete(tripId);
  }

  /**
   * Clear all trip call counts
   */
  clearAll(): void {
    this.tripCallCounts.clear();
  }
}

export const googlePlacesLimiter = new GooglePlacesLimiter();

