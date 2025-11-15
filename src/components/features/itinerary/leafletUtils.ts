import { logger } from "@/lib/logger";

const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

export type LeafletLatLng = {
  lat: number;
  lng: number;
};

export type LeafletLatLngBounds = {
  extend(latlng: LeafletLatLng): void;
  pad(factor: number): LeafletLatLngBounds;
};

export type LeafletMarker = {
  bindPopup(html: string): LeafletMarker;
  on(event: string, handler: () => void): void;
  getLatLng(): LeafletLatLng;
  getElement(): HTMLElement | null;
  openPopup(): void;
  closePopup(): void;
};

export type LeafletPolyline = {
  addTo(map: LeafletMap): LeafletPolyline;
  setStyle(options: {
    color?: string;
    weight?: number;
    opacity?: number;
    dashArray?: string;
  }): void;
  bringToFront?: () => void;
  getElement?: () => HTMLElement | null;
};

export type LeafletLayer = LeafletMarker | LeafletPolyline;

export type LeafletLayerGroup = {
  addTo(map: LeafletMap): LeafletLayerGroup;
  addLayer(layer: LeafletLayer): void;
  clearLayers(): void;
};

export type LeafletTileLayer = {
  addTo(map: LeafletMap): LeafletTileLayer;
};

export type LeafletMap = {
  on(event: string, handler: () => void): void;
  setView(center: [number, number], zoom: number): void;
  fitBounds(bounds: LeafletLatLngBounds, options?: { maxZoom?: number }): void;
  panTo(latlng: LeafletLatLng, options?: { animate?: boolean; duration?: number }): void;
  remove(): void;
};

export type LeafletModule = {
  map(
    container: HTMLElement,
    options: {
      zoomControl: boolean;
      attributionControl: boolean;
      center: [number, number];
      zoom: number;
    }
  ): LeafletMap;
  layerGroup(): LeafletLayerGroup;
  tileLayer(
    url: string,
    options: {
      attribution: string;
      subdomains: string;
      maxZoom: number;
    }
  ): LeafletTileLayer;
  marker(position: [number, number]): LeafletMarker;
  polyline(
    latlngs: [number, number][],
    options: {
      color?: string;
      weight?: number;
      opacity?: number;
      dashArray?: string;
      className?: string;
    }
  ): LeafletPolyline;
  latLngBounds(initial: unknown[]): LeafletLatLngBounds;
};

declare global {
  interface Window {
    L?: LeafletModule;
    __leafletLoadingPromise?: Promise<LeafletModule | null>;
  }
}

export function ensureLeafletResources(): Promise<LeafletModule | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (window.__leafletLoadingPromise) {
    return window.__leafletLoadingPromise;
  }

  // Ensure CSS is loaded
  if (!document.querySelector(`link[data-origin="leaflet"]`)) {
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", LEAFLET_CSS_URL);
    link.setAttribute("data-origin", "leaflet");
    document.head.appendChild(link);
  }

  // Check if script already exists in DOM
  const existingScript = document.querySelector(`script[src="${LEAFLET_JS_URL}"]`) as HTMLScriptElement | null;
  if (existingScript) {
    // If Leaflet is already available, return it immediately
    if (window.L) {
      return Promise.resolve(window.L);
    }

    // If script exists but Leaflet isn't loaded yet, wait for it
    // Check if script has already failed (no src or error state)
    if (!existingScript.src || existingScript.getAttribute("data-error") === "true") {
      // Script has failed, remove it and create a new one
      existingScript.remove();
    } else {
      // Script is still loading, wait for it
      window.__leafletLoadingPromise = new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (window.L) {
            clearInterval(checkInterval);
            resolve(window.L);
          }
        }, 50);

        const timeout = setTimeout(() => {
          clearInterval(checkInterval);
          const error = new Error(`Leaflet script loaded but library not available after timeout`);
          logger.error("Leaflet library not available", error);
          reject(error);
        }, 10000);

        const handleLoad = () => {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve(window.L ?? null);
        };

        const handleError = () => {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          existingScript.setAttribute("data-error", "true");
          const error = new Error(`Failed to load Leaflet script from ${LEAFLET_JS_URL}`);
          logger.error("Failed to load Leaflet script", error);
          reject(error);
        };

        // Only add listeners if script hasn't loaded/failed yet
        // Check script readyState (exists on script elements but not in TypeScript types)
        const scriptReadyState = (existingScript as HTMLScriptElement & { readyState?: string }).readyState;
        if (scriptReadyState === "complete" || scriptReadyState === "loaded") {
          handleLoad();
        } else {
          existingScript.addEventListener("load", handleLoad, { once: true });
          existingScript.addEventListener("error", handleError, { once: true });
        }
      });

      return window.__leafletLoadingPromise;
    }
  }

  window.__leafletLoadingPromise = new Promise((resolve, reject) => {
    // Ensure DOM is ready
    const loadScript = () => {
      const script = document.createElement("script");
      script.src = LEAFLET_JS_URL;
      script.async = true;
      script.setAttribute("data-origin", "leaflet");
      
      script.addEventListener("load", () => {
        if (window.L) {
          resolve(window.L);
        } else {
          const error = new Error(`Leaflet script loaded but window.L is not available`);
          logger.error("Leaflet library not available after script load", error);
          reject(error);
        }
      });

      script.addEventListener("error", (event) => {
        // Mark script as failed
        script.setAttribute("data-error", "true");
        // Extract more details from the error event if possible
        const errorDetails = {
          url: LEAFLET_JS_URL,
          type: event.type,
          target: event.target instanceof HTMLScriptElement ? event.target.src : "unknown",
        };
        const error = new Error(`Failed to load Leaflet script from ${LEAFLET_JS_URL}. Details: ${JSON.stringify(errorDetails)}`);
        logger.error("Failed to load Leaflet script", error, errorDetails);
        // Clean up the promise so retries can happen
        delete window.__leafletLoadingPromise;
        reject(error);
      });

      // Append to head instead of body for better compatibility
      document.head.appendChild(script);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", loadScript);
    } else {
      loadScript();
    }
  });

  return window.__leafletLoadingPromise;
}

