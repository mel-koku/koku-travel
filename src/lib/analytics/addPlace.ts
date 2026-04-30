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

/**
 * Fires when the user clicks the "Search smarter ✨" button to trigger LLM
 * query rewriting (Tier 3 of the smart-search cascade). Tracks per-call
 * Vertex spend and how often catalog + fuzzy + semantic together miss what
 * the LLM ultimately catches.
 */
export function trackSmartSearchTriggered(props: {
  query: string;
}): void {
  getGtag()?.("event", "add_place_smart_search_triggered", props);
}

/**
 * Fires when the smart-search call returns one or more results. `hadResults`
 * distinguishes "LLM understood and catalog matched" from "LLM understood
 * but catalog still empty" (the latter is signal that the catalog needs the
 * place added).
 */
export function trackSmartSearchCompleted(props: {
  query: string;
  candidateCount: number;
  hadResults: boolean;
}): void {
  getGtag()?.("event", "add_place_smart_search_completed", props);
}
