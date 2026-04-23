type GtagFn = (event: string, name: string, options: Record<string, unknown>) => void;

export function getGtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof gtag === "function" ? gtag : null;
}

export function trackCustomLocationAdded(props: {
  addressSource: "mapbox" | "google" | "as-is";
  hasStartTime: boolean;
  fieldsFilled: number;
}): void {
  getGtag()?.("event", "custom_location_added", props);
}

export function trackCustomLocationEdited(props: {
  addressSource: "mapbox" | "google" | "as-is";
  fieldsChanged: number;
}): void {
  getGtag()?.("event", "custom_location_edited", props);
}

export function trackCustomLocationDeleted(props: { hadAddress: boolean }): void {
  getGtag()?.("event", "custom_location_deleted", props);
}

export function trackGoogleFallbackTapped(props: { mapboxResultCount: number }): void {
  getGtag()?.("event", "custom_location_google_fallback_tapped", props);
}
