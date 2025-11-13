export type Coordinates = {
  lat: number;
  lng: number;
};

const LOCATION_COORDINATES_BY_ID: Record<string, Coordinates> = {
  "kyoto-fushimi-inari-taisha": { lat: 34.967146, lng: 135.772695 },
  "kyoto-ginkaku-ji-silver-pavilion": { lat: 35.027045, lng: 135.798611 },
  "kyoto-gion-aya-kimono-rental": { lat: 35.003891, lng: 135.774642 },
  "kyoto-arabica-kyoto-higashiyama": { lat: 35.002824, lng: 135.778064 },
  "kyoto-nishiki-market": { lat: 35.004512, lng: 135.764559 },
  "kyoto-arashiyama-bamboo-grove": { lat: 35.010203, lng: 135.6671 },
  "kyoto-tenryu-ji": { lat: 35.016867, lng: 135.676449 },
  "kyoto-katsura-riverside-cafe": { lat: 35.015346, lng: 135.676978 },
  "kyoto-gion-district": { lat: 35.003412, lng: 135.773981 },
};

const LOCATION_COORDINATES_BY_NAME: Record<string, Coordinates> = {
  "fushimi inari taisha": { lat: 34.967146, lng: 135.772695 },
  "gion aya kimono rental": { lat: 35.003891, lng: 135.774642 },
  "% arabica kyoto higashiyama": { lat: 35.002824, lng: 135.778064 },
  "ginkaku-ji (silver pavilion)": { lat: 35.027045, lng: 135.798611 },
  "nishiki market": { lat: 35.004512, lng: 135.764559 },
  "gion evening stroll": { lat: 35.003412, lng: 135.773981 },
  "arashiyama bamboo grove": { lat: 35.010203, lng: 135.6671 },
  "tenryu-ji temple": { lat: 35.016867, lng: 135.676449 },
  "katsura riverside cafe": { lat: 35.015346, lng: 135.676978 },
  "gion district": { lat: 35.003412, lng: 135.773981 },
};

export function getCoordinatesForLocationId(id: string): Coordinates | null {
  return LOCATION_COORDINATES_BY_ID[id] ?? null;
}

export function getCoordinatesForName(name: string): Coordinates | null {
  const normalized = name.trim().toLowerCase();
  return LOCATION_COORDINATES_BY_NAME[normalized] ?? null;
}


