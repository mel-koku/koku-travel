/**
 * GA4 events for the itinerary "Add a place" modal.
 *
 * `addPlaceCompleted` is the headline ratio metric: catalog vs custom adds.
 * Used to validate that the catalog-first default tab matches user behavior;
 * if customs dominate, we may want to swap defaults.
 *
 * `addPlaceNoResultsCta` measures how often the catalog misses something the
 * user wants — a high firing rate suggests the catalog needs more coverage
 * (or that the custom flow should be more prominent).
 */

type GtagFn = (event: string, name: string, options: Record<string, unknown>) => void;

function getGtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof gtag === "function" ? gtag : null;
}

/**
 * Fires when the user successfully adds a place via the "Add a place" modal.
 * Distinguishes catalog (Yuku DB pick) from custom (user-authored entry).
 */
export function trackAddPlaceCompleted(props: {
  source: "catalog" | "custom";
}): void {
  getGtag()?.("event", "add_place_completed", props);
}

/**
 * Fires when the user clicks the "Add 'X' as a custom place" CTA inside the
 * empty-state of catalog search. Indicates a catalog miss the custom flow
 * caught.
 */
export function trackAddPlaceNoResultsCta(props: {
  query: string;
}): void {
  getGtag()?.("event", "add_place_no_results_cta", props);
}
