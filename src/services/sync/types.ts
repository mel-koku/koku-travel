/**
 * Types for Supabase sync operations
 */

export type SyncResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type SavedRow = {
  place_id: string;
  location_id?: string;
};

export type GuideBookmarkRow = {
  guide_id: string;
};

export type SyncConfig = {
  /** Whether to suppress "Auth session missing" errors */
  suppressAuthErrors?: boolean;
};
