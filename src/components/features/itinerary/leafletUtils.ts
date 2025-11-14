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

  if (!document.querySelector(`link[data-origin="leaflet"]`)) {
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", LEAFLET_CSS_URL);
    link.setAttribute("data-origin", "leaflet");
    document.head.appendChild(link);
  }

  window.__leafletLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.addEventListener("load", () => {
      resolve(window.L ?? null);
    });
    script.addEventListener("error", (event) => {
      console.error("Failed to load Leaflet script", event);
      reject(new Error("Failed to load Leaflet script."));
    });
    document.body.appendChild(script);
  });

  return window.__leafletLoadingPromise;
}

