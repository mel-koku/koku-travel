/**
 * Real-time availability status for a location
 */
export type AvailabilityStatus = 
  | "open"
  | "closed"
  | "busy"
  | "requires_reservation"
  | "unknown";

/**
 * Availability information for a location
 */
export type AvailabilityInfo = {
  /**
   * Current availability status
   */
  status: AvailabilityStatus;
  /**
   * Optional message explaining the status
   */
  message?: string;
  /**
   * Timestamp when this availability was checked
   */
  checkedAt: string;
  /**
   * Whether a reservation is recommended or required
   */
  reservationRequired?: boolean;
  /**
   * Optional busy level (0-100) when status is "busy"
   */
  busyLevel?: number;
};

