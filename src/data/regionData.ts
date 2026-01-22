/**
 * Japan region definitions for map clustering in Trip Builder V2.
 *
 * Each region includes center coordinates, bounding boxes, and recommended zoom levels.
 * Used for region-based map clustering to improve UX with 800+ cities.
 */

export type RegionId =
  | "hokkaido"
  | "tohoku"
  | "kanto"
  | "chubu"
  | "kansai"
  | "chugoku"
  | "shikoku"
  | "kyushu"
  | "okinawa";

export type RegionData = {
  id: RegionId;
  name: string;
  nameJa: string;
  center: { lat: number; lng: number };
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoomLevel: number;
};

/**
 * Map of region names (as stored in city metadata) to region IDs.
 */
export const REGION_NAME_TO_ID: Record<string, RegionId> = {
  Hokkaido: "hokkaido",
  Tohoku: "tohoku",
  Kanto: "kanto",
  Chubu: "chubu",
  Kansai: "kansai",
  Chugoku: "chugoku",
  Shikoku: "shikoku",
  Kyushu: "kyushu",
  Okinawa: "okinawa",
};

/**
 * Japan's 9 regions with their geographic data.
 */
export const REGIONS: Record<RegionId, RegionData> = {
  hokkaido: {
    id: "hokkaido",
    name: "Hokkaido",
    nameJa: "北海道",
    center: { lat: 43.0642, lng: 141.3469 },
    bounds: {
      north: 45.5,
      south: 41.4,
      east: 145.9,
      west: 139.3,
    },
    zoomLevel: 6.5,
  },
  tohoku: {
    id: "tohoku",
    name: "Tohoku",
    nameJa: "東北",
    center: { lat: 39.7036, lng: 140.1023 },
    bounds: {
      north: 41.5,
      south: 37.0,
      east: 142.1,
      west: 139.0,
    },
    zoomLevel: 6.5,
  },
  kanto: {
    id: "kanto",
    name: "Kanto",
    nameJa: "関東",
    center: { lat: 35.6762, lng: 139.6503 },
    bounds: {
      north: 37.0,
      south: 34.5,
      east: 140.9,
      west: 138.2,
    },
    zoomLevel: 7,
  },
  chubu: {
    id: "chubu",
    name: "Chubu",
    nameJa: "中部",
    center: { lat: 35.9, lng: 137.5 },
    bounds: {
      north: 37.5,
      south: 34.5,
      east: 139.2,
      west: 135.8,
    },
    zoomLevel: 7,
  },
  kansai: {
    id: "kansai",
    name: "Kansai",
    nameJa: "関西",
    center: { lat: 34.6937, lng: 135.5023 },
    bounds: {
      north: 36.0,
      south: 33.4,
      east: 136.8,
      west: 134.0,
    },
    zoomLevel: 7.5,
  },
  chugoku: {
    id: "chugoku",
    name: "Chugoku",
    nameJa: "中国",
    center: { lat: 34.6657, lng: 133.0 },
    bounds: {
      north: 36.0,
      south: 33.5,
      east: 134.5,
      west: 130.8,
    },
    zoomLevel: 7.5,
  },
  shikoku: {
    id: "shikoku",
    name: "Shikoku",
    nameJa: "四国",
    center: { lat: 33.8416, lng: 133.5383 },
    bounds: {
      north: 34.5,
      south: 32.7,
      east: 134.8,
      west: 132.0,
    },
    zoomLevel: 7.5,
  },
  kyushu: {
    id: "kyushu",
    name: "Kyushu",
    nameJa: "九州",
    center: { lat: 33.0, lng: 131.0 },
    bounds: {
      north: 34.3,
      south: 31.0,
      east: 132.1,
      west: 129.5,
    },
    zoomLevel: 7,
  },
  okinawa: {
    id: "okinawa",
    name: "Okinawa",
    nameJa: "沖縄",
    center: { lat: 26.2124, lng: 127.6809 },
    bounds: {
      north: 27.5,
      south: 24.0,
      east: 131.5,
      west: 122.9,
    },
    zoomLevel: 7,
  },
};

/**
 * Get all regions as an array, ordered from north to south.
 */
export function getRegionsArray(): RegionData[] {
  return [
    REGIONS.hokkaido,
    REGIONS.tohoku,
    REGIONS.kanto,
    REGIONS.chubu,
    REGIONS.kansai,
    REGIONS.chugoku,
    REGIONS.shikoku,
    REGIONS.kyushu,
    REGIONS.okinawa,
  ];
}

/**
 * Get region data by name (as stored in city metadata).
 */
export function getRegionByName(name: string): RegionData | undefined {
  const id = REGION_NAME_TO_ID[name];
  return id ? REGIONS[id] : undefined;
}

/**
 * Get region data by ID.
 */
export function getRegionById(id: RegionId): RegionData {
  return REGIONS[id];
}

/**
 * Zoom threshold for auto-switching back to region view.
 * When zoom level goes below this, switch from city view to region view.
 */
export const REGION_VIEW_ZOOM_THRESHOLD = 6.5;

/**
 * Default zoom level for Japan overview (region view).
 */
export const JAPAN_OVERVIEW_ZOOM = 5;
