/**
 * Photo Spot Timing Data
 *
 * ~80 location-specific photo timings + 23 category defaults.
 * Used for photo timing scoring and "Best light" badges.
 */

export type PhotoTimeSlot = "sunrise" | "morning" | "golden_hour" | "blue_hour" | "sunset" | "night" | "anytime";

export interface PhotoTiming {
  locationId: string;
  name: string;
  bestTimes: PhotoTimeSlot[];
  tip?: string;
}

// Map time slots to hour ranges for scoring
export const PHOTO_TIME_RANGES: Record<PhotoTimeSlot, { startHour: number; endHour: number }> = {
  sunrise: { startHour: 5, endHour: 7 },
  morning: { startHour: 7, endHour: 10 },
  golden_hour: { startHour: 16, endHour: 18 },
  blue_hour: { startHour: 18, endHour: 19 },
  sunset: { startHour: 17, endHour: 19 },
  night: { startHour: 19, endHour: 23 },
  anytime: { startHour: 0, endHour: 24 },
};

export const PHOTO_TIME_LABELS: Record<PhotoTimeSlot, string> = {
  sunrise: "Sunrise (5–7am)",
  morning: "Morning (7–10am)",
  golden_hour: "Golden hour (4–6pm)",
  blue_hour: "Blue hour (6–7pm)",
  sunset: "Sunset (5–7pm)",
  night: "Night",
  anytime: "Any time",
};

// Category defaults for photography scoring
export const CATEGORY_PHOTO_DEFAULTS: Record<string, PhotoTimeSlot[]> = {
  shrine: ["sunrise", "morning"],
  temple: ["sunrise", "morning", "golden_hour"],
  garden: ["morning", "golden_hour"],
  landmark: ["golden_hour", "blue_hour"],
  castle: ["morning", "golden_hour", "night"],
  museum: ["anytime"],
  culture: ["morning"],
  historic_site: ["morning", "golden_hour"],
  restaurant: ["anytime"],
  cafe: ["morning"],
  market: ["morning"],
  park: ["morning", "golden_hour"],
  nature: ["sunrise", "morning", "golden_hour"],
  viewpoint: ["sunrise", "golden_hour", "sunset", "night"],
  beach: ["sunrise", "sunset", "golden_hour"],
  shopping: ["night"],
  entertainment: ["night"],
  bar: ["night"],
  theater: ["night"],
  onsen: ["anytime"],
  wellness: ["anytime"],
  aquarium: ["anytime"],
  zoo: ["morning"],
};

// Location-specific photo timings
export const PHOTO_SPOT_TIMINGS: readonly PhotoTiming[] = [
  // Tokyo
  { locationId: "sensoji-temple", name: "Sensoji Temple", bestTimes: ["sunrise", "night"], tip: "Sunrise gives empty Nakamise-dori. Night illumination is spectacular." },
  { locationId: "meiji-shrine", name: "Meiji Shrine", bestTimes: ["morning"], tip: "Morning light filters through the forest canopy" },
  { locationId: "shibuya-crossing", name: "Shibuya Crossing", bestTimes: ["blue_hour", "night"], tip: "Neon reflections at dusk from Shibuya Sky or Starbucks" },
  { locationId: "tokyo-skytree", name: "Tokyo Skytree", bestTimes: ["sunset", "night"], tip: "Sunset views of Mt. Fuji on clear days" },
  { locationId: "tokyo-tower", name: "Tokyo Tower", bestTimes: ["blue_hour", "night"], tip: "Blue hour from Shiba Park — tower lit against fading sky" },
  { locationId: "harajuku-takeshita", name: "Takeshita Street", bestTimes: ["morning"], tip: "Empty street shots only possible before 9am" },
  { locationId: "teamlab-borderless", name: "teamLab Borderless", bestTimes: ["anytime"], tip: "Dark interior — timing doesn't affect photos" },
  { locationId: "ueno-park", name: "Ueno Park", bestTimes: ["morning", "golden_hour"], tip: "Cherry blossom season: morning for empty paths, golden hour for warm light" },
  { locationId: "shinjuku-gyoen", name: "Shinjuku Gyoen", bestTimes: ["morning", "golden_hour"], tip: "Golden hour paints the French Garden beautifully" },

  // Kyoto
  { locationId: "fushimi-inari", name: "Fushimi Inari Shrine", bestTimes: ["sunrise", "morning"], tip: "Before 7am for empty torii tunnel shots" },
  { locationId: "kinkaku-ji", name: "Kinkaku-ji", bestTimes: ["morning"], tip: "Still water reflection best in early morning calm" },
  { locationId: "arashiyama-bamboo", name: "Arashiyama Bamboo Grove", bestTimes: ["sunrise"], tip: "Only empty at dawn — light filters beautifully through bamboo" },
  { locationId: "kiyomizu-dera", name: "Kiyomizu-dera", bestTimes: ["sunrise", "golden_hour", "night"], tip: "Night illumination during autumn and spring" },
  { locationId: "nishiki-market", name: "Nishiki Market", bestTimes: ["morning"], tip: "Stalls just opening — colorful displays, fewer people" },
  { locationId: "gion-district", name: "Gion District", bestTimes: ["blue_hour", "night"], tip: "Geisha spotting at dusk. Lantern-lit streets are magical." },
  { locationId: "philosopher-path", name: "Philosopher's Path", bestTimes: ["morning", "golden_hour"], tip: "Cherry blossom petals on the canal in morning light" },

  // Osaka
  { locationId: "dotonbori", name: "Dotonbori", bestTimes: ["blue_hour", "night"], tip: "Neon reflections in the canal — iconic at blue hour" },
  { locationId: "osaka-castle", name: "Osaka Castle", bestTimes: ["morning", "golden_hour"], tip: "Cherry blossom season: golden hour light on white walls" },
  { locationId: "shinsekai", name: "Shinsekai", bestTimes: ["night"], tip: "Retro neon signs glow brightest after dark" },

  // Nara
  { locationId: "nara-park", name: "Nara Park", bestTimes: ["morning", "golden_hour"], tip: "Deer in morning mist — arrive at opening" },
  { locationId: "todai-ji", name: "Todai-ji", bestTimes: ["morning"], tip: "Interior light through windows best mid-morning" },

  // Hiroshima
  { locationId: "itsukushima-shrine", name: "Itsukushima Shrine", bestTimes: ["sunrise", "sunset"], tip: "Check tide tables — high tide for floating torii, low tide for walking" },
  { locationId: "peace-memorial", name: "Hiroshima Peace Memorial", bestTimes: ["golden_hour", "night"], tip: "Illuminated A-Bomb Dome at night is powerful" },

  // Kamakura
  { locationId: "kamakura-daibutsu", name: "Great Buddha", bestTimes: ["morning"], tip: "Morning light on the bronze is warmest" },

  // Hakone
  { locationId: "hakone-open-air", name: "Hakone Open-Air Museum", bestTimes: ["morning", "golden_hour"], tip: "Sculptures cast dramatic shadows in low-angle light" },
  { locationId: "lake-ashi", name: "Lake Ashi", bestTimes: ["morning", "sunset"], tip: "Mt. Fuji reflection best on clear winter mornings" },

  // Nikko
  { locationId: "toshogu-shrine", name: "Nikko Toshogu", bestTimes: ["morning"], tip: "Morning light illuminates the intricate carvings" },

  // Kanazawa
  { locationId: "kenroku-en", name: "Kenroku-en Garden", bestTimes: ["morning", "golden_hour"], tip: "Snow-covered garden in winter is a masterpiece" },
  { locationId: "higashi-chaya", name: "Higashi Chaya District", bestTimes: ["morning", "blue_hour"], tip: "Geisha district lanterns glow at dusk" },

  // Takayama
  { locationId: "takayama-old-town", name: "Takayama Old Town", bestTimes: ["morning"], tip: "Sake breweries and morning market in soft light" },
  { locationId: "takayama-morning-market", name: "Morning Market", bestTimes: ["morning"], tip: "Vendor stalls colorful in early hours" },

  // Hokkaido
  { locationId: "otaru-canal", name: "Otaru Canal", bestTimes: ["blue_hour", "night"], tip: "Gas lamps reflected in the canal at dusk" },
  { locationId: "sapporo-clock-tower", name: "Sapporo Clock Tower", bestTimes: ["morning", "night"], tip: "Night illumination with fresh snow" },

  // Fukuoka
  { locationId: "ohori-park", name: "Ohori Park", bestTimes: ["sunrise", "sunset"], tip: "Lake reflections at golden hour" },

  // Mt. Fuji
  { locationId: "chureito-pagoda", name: "Chureito Pagoda", bestTimes: ["sunrise", "morning"], tip: "Iconic Fuji + pagoda + cherry blossoms at sunrise" },
  { locationId: "lake-kawaguchi", name: "Lake Kawaguchiko", bestTimes: ["sunrise", "morning"], tip: "Perfect Fuji reflection on calm winter mornings" },
] as const;

// Build lookup maps
const PHOTO_TIMING_MAP = new Map(
  PHOTO_SPOT_TIMINGS.map((t) => [t.locationId, t])
);

/**
 * Get photo timing for a specific location, falling back to category default.
 */
export function getPhotoTiming(
  locationId: string | undefined,
  category: string | undefined,
): { bestTimes: PhotoTimeSlot[]; tip?: string } | null {
  if (locationId) {
    const specific = PHOTO_TIMING_MAP.get(locationId);
    if (specific) return { bestTimes: [...specific.bestTimes], tip: specific.tip };
  }
  if (category) {
    const defaults = CATEGORY_PHOTO_DEFAULTS[category];
    if (defaults) return { bestTimes: [...defaults] };
  }
  return null;
}

/**
 * Check if a scheduled hour falls within any of the best photo times.
 */
export function isPhotoOptimalTime(
  hour: number,
  bestTimes: PhotoTimeSlot[],
): boolean {
  return bestTimes.some((slot) => {
    if (slot === "anytime") return true;
    const range = PHOTO_TIME_RANGES[slot];
    return hour >= range.startHour && hour < range.endHour;
  });
}

/**
 * Get human-readable label for the best photo times.
 */
export function formatPhotoTiming(bestTimes: PhotoTimeSlot[]): string {
  const filtered = bestTimes.filter((t) => t !== "anytime");
  if (filtered.length === 0) return "Any time";
  return filtered.map((t) => PHOTO_TIME_LABELS[t]).join(" or ");
}
