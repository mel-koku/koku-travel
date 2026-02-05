/**
 * Geography-related constants and helpers for data quality rules
 */

/**
 * Japan geographic bounds (approximately)
 * - Latitude: 24°N (Okinawa) to 46°N (Hokkaido)
 * - Longitude: 122°E (Yonaguni) to 154°E (Minami-Torishima)
 */
export const JAPAN_BOUNDS = {
  lat: { min: 24.0, max: 46.0 },
  lng: { min: 122.0, max: 154.0 },
};

/**
 * Valid location categories in the database
 */
export const VALID_CATEGORIES = [
  'accommodation',
  'attraction',
  'bar',
  'culture',
  'entertainment',
  'experience',
  'food',
  'landmark',
  'market',
  'museum',
  'nature',
  'park',
  'restaurant',
  'shopping',
  'shrine',
  'temple',
  'transport',
  'viewpoint',
  'wellness',
];

/**
 * Prefecture to Region mapping for Japan
 */
export const PREFECTURE_REGION_MAP: Record<string, string> = {
  // Hokkaido
  'Hokkaido': 'Hokkaido',

  // Tohoku
  'Aomori': 'Tohoku',
  'Iwate': 'Tohoku',
  'Miyagi': 'Tohoku',
  'Akita': 'Tohoku',
  'Yamagata': 'Tohoku',
  'Fukushima': 'Tohoku',

  // Kanto
  'Ibaraki': 'Kanto',
  'Tochigi': 'Kanto',
  'Gunma': 'Kanto',
  'Saitama': 'Kanto',
  'Chiba': 'Kanto',
  'Tokyo': 'Kanto',
  'Kanagawa': 'Kanto',

  // Chubu
  'Niigata': 'Chubu',
  'Toyama': 'Chubu',
  'Ishikawa': 'Chubu',
  'Fukui': 'Chubu',
  'Yamanashi': 'Chubu',
  'Nagano': 'Chubu',
  'Gifu': 'Chubu',
  'Shizuoka': 'Chubu',
  'Aichi': 'Chubu',

  // Kansai
  'Mie': 'Kansai',
  'Shiga': 'Kansai',
  'Kyoto': 'Kansai',
  'Osaka': 'Kansai',
  'Hyogo': 'Kansai',
  'Nara': 'Kansai',
  'Wakayama': 'Kansai',

  // Chugoku
  'Tottori': 'Chugoku',
  'Shimane': 'Chugoku',
  'Okayama': 'Chugoku',
  'Hiroshima': 'Chugoku',
  'Yamaguchi': 'Chugoku',

  // Shikoku
  'Tokushima': 'Shikoku',
  'Kagawa': 'Shikoku',
  'Ehime': 'Shikoku',
  'Kochi': 'Shikoku',

  // Kyushu
  'Fukuoka': 'Kyushu',
  'Saga': 'Kyushu',
  'Nagasaki': 'Kyushu',
  'Kumamoto': 'Kyushu',
  'Oita': 'Kyushu',
  'Miyazaki': 'Kyushu',
  'Kagoshima': 'Kyushu',

  // Okinawa
  'Okinawa': 'Okinawa',
};

/**
 * Get all valid prefectures
 */
export function getValidPrefectures(): string[] {
  return Object.keys(PREFECTURE_REGION_MAP);
}

/**
 * Get all valid regions
 */
export function getValidRegions(): string[] {
  return Array.from(new Set(Object.values(PREFECTURE_REGION_MAP)));
}

/**
 * Get the expected region for a prefecture
 */
export function getExpectedRegion(prefecture: string): string | null {
  // Normalize prefecture name
  const normalized = normalizePrefectureName(prefecture);
  return PREFECTURE_REGION_MAP[normalized] || null;
}

/**
 * Normalize prefecture name (handle common variations)
 */
export function normalizePrefectureName(name: string): string {
  // Remove common suffixes
  let normalized = name.trim();
  normalized = normalized.replace(/\s+(Prefecture|Ken|Fu|To|Do)$/i, '');
  normalized = normalized.replace(/-(ken|fu|to|do)$/i, '');

  // Capitalize first letter
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

/**
 * Check if coordinates are within Japan bounds
 */
export function isWithinJapan(lat: number, lng: number): boolean {
  return (
    lat >= JAPAN_BOUNDS.lat.min &&
    lat <= JAPAN_BOUNDS.lat.max &&
    lng >= JAPAN_BOUNDS.lng.min &&
    lng <= JAPAN_BOUNDS.lng.max
  );
}

/**
 * Get coordinate precision (number of decimal places)
 */
export function getCoordinatePrecision(value: number): number {
  const str = value.toString();
  const decimalIndex = str.indexOf('.');
  if (decimalIndex === -1) return 0;
  return str.length - decimalIndex - 1;
}

/**
 * Check if coordinate precision is sufficient (>= 4 decimal places = ~11m accuracy)
 */
export function hasSufficientPrecision(lat: number, lng: number): boolean {
  return getCoordinatePrecision(lat) >= 4 && getCoordinatePrecision(lng) >= 4;
}

/**
 * City normalization rules - canonical mappings
 */
const CITY_CANONICAL_NAMES: Record<string, string> = {
  // Examples - add more as discovered
  'amakusa, kumamoto': 'Amakusa',
  'asahikawa/kamikawa': 'Asahikawa',
};

/**
 * Normalize city name to canonical form
 * - Strip prefecture suffix: "Amakusa, Kumamoto" → "Amakusa"
 * - Normalize slashes: "Asahikawa/Kamikawa" → "Asahikawa"
 * - Use canonical mappings for known variants
 */
export function normalizeCityName(city: string): string {
  const lowerCity = city.toLowerCase().trim();

  // Check canonical mappings first
  if (CITY_CANONICAL_NAMES[lowerCity]) {
    return CITY_CANONICAL_NAMES[lowerCity];
  }

  let normalized = city.trim();

  // Strip prefecture suffix after comma: "Amakusa, Kumamoto" → "Amakusa"
  if (normalized.includes(',')) {
    normalized = normalized.split(',')[0].trim();
  }

  // Take first part before slash: "Asahikawa/Kamikawa" → "Asahikawa"
  if (normalized.includes('/')) {
    normalized = normalized.split('/')[0].trim();
  }

  return normalized;
}

/**
 * Check if a city name needs normalization
 */
export function cityNeedsNormalization(city: string): boolean {
  const normalized = normalizeCityName(city);
  return normalized !== city.trim();
}

/**
 * Get city normalization suggestion
 */
export function getCityNormalizationSuggestion(city: string): {
  normalized: string;
  reason: string;
} | null {
  const normalized = normalizeCityName(city);

  if (normalized === city.trim()) {
    return null;
  }

  let reason = '';
  if (city.includes(',')) {
    reason = 'Removed prefecture suffix after comma';
  } else if (city.includes('/')) {
    reason = 'Removed secondary city name after slash';
  } else {
    reason = 'Canonical name mapping applied';
  }

  return { normalized, reason };
}

/**
 * Parse duration string to minutes
 * Handles: "1-2 hours", "30 mins", "1.5 hours", "2 hours", etc.
 */
export function parseDurationToMinutes(duration: string): number | null {
  if (!duration) return null;

  const lowerDuration = duration.toLowerCase().trim();

  // Match patterns like "1-2 hours", "30-60 minutes"
  const rangeMatch = lowerDuration.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(hour|hr|min|minute)/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    const unit = rangeMatch[3].toLowerCase();
    const avg = (min + max) / 2;
    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      return avg * 60;
    }
    return avg;
  }

  // Match patterns like "2 hours", "30 mins", "1.5 hours"
  const singleMatch = lowerDuration.match(/(\d+(?:\.\d+)?)\s*(hour|hr|min|minute)/i);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]);
    const unit = singleMatch[2].toLowerCase();
    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      return value * 60;
    }
    return value;
  }

  return null;
}

/**
 * Check if duration is unrealistic
 * Returns reason if unrealistic, null if valid
 */
export function checkUnrealisticDuration(duration: string): string | null {
  const minutes = parseDurationToMinutes(duration);

  if (minutes === null) {
    return null; // Can't parse, not necessarily invalid
  }

  if (minutes < 15) {
    return `Duration too short: ${minutes} minutes (minimum 15)`;
  }

  if (minutes > 480) {
    // 8 hours
    return `Duration too long: ${Math.round(minutes / 60)} hours (maximum 8)`;
  }

  return null;
}

/**
 * Major Japanese cities for name mismatch detection
 */
export const MAJOR_CITIES = [
  'Tokyo',
  'Osaka',
  'Kyoto',
  'Yokohama',
  'Nagoya',
  'Sapporo',
  'Fukuoka',
  'Kobe',
  'Kawasaki',
  'Hiroshima',
  'Sendai',
  'Kitakyushu',
  'Chiba',
  'Sakai',
  'Niigata',
  'Hamamatsu',
  'Kumamoto',
  'Sagamihara',
  'Okayama',
  'Shizuoka',
  'Kagoshima',
  'Kanazawa',
  'Nara',
  'Nagasaki',
  'Matsuyama',
  'Takamatsu',
];

/**
 * Map of major cities to their prefectures
 * Used to detect when city field uses prefecture name instead of city
 */
const CITY_TO_PREFECTURE: Record<string, string> = {
  'sendai': 'miyagi',
  'kanazawa': 'ishikawa',
  'matsuyama': 'ehime',
  'takamatsu': 'kagawa',
  'nagasaki': 'nagasaki',  // Same name
  'kumamoto': 'kumamoto',  // Same name
  'kagoshima': 'kagoshima', // Same name
  'hiroshima': 'hiroshima', // Same name
  'okayama': 'okayama', // Same name
  'niigata': 'niigata', // Same name
  'nagoya': 'aichi',
  'sapporo': 'hokkaido',
  'yokohama': 'kanagawa',
  'kobe': 'hyogo',
  'kawasaki': 'kanagawa',
  'hamamatsu': 'shizuoka',
  'shizuoka': 'shizuoka', // Same name
  'chiba': 'chiba', // Same name
  'sakai': 'osaka',
};

/**
 * Patterns in names that indicate the city name is NOT a location reference
 * (brand names, style references, historical names, known compound names)
 */
const NAME_EXCEPTION_PATTERNS = [
  /\bkawasaki\s+(heavy|industries)/i, // Kawasaki Heavy Industries
  /\bg\.\s*sakai\b/i, // G. Sakai (brand)
  /\baji\s+no\s+sapporo\b/i, // Sapporo-style food
  /\bbitchu\s+matsuyama\b/i, // Historical region name
  /\bsapporo\b.*\b(ramen|beer|lager|style|stellar)\b/i, // Sapporo products/style
  /\b(ramen|beer|lager|style)\b.*\bsapporo\b/i, // Sapporo products/style
  /\bkyoto\s+(style|sushi|cuisine|head\s+shop)\b/i, // Kyoto style/shops
  /\bosaka\s+(style|okonomiyaki|sushi)\b/i, // Osaka style food
  /\btokyo\s+(disney|disneyland|disneysea|sea|game|metropolitan|international)/i, // Tokyo brand names in other areas
  /\bsushi\s+sakai\b/i, // Restaurant name
  /\btakamatsu\s+park\b/i, // Park name (not city reference)
  /\bkanazawa\s+district\b/i, // District name in Yokohama
  /\bnara\s+ikaruga\b/i, // Regional tourism name
  /\bniigata\s+prefectural\b/i, // Prefecture-level institution
];

/**
 * Check if a location name contains a different city name than where it's located
 */
export function findMismatchedCityInName(
  locationName: string,
  actualCity: string
): string | null {
  const nameLower = locationName.toLowerCase();
  const actualCityLower = actualCity.toLowerCase();

  // Check if name matches any exception patterns (brand names, style references)
  for (const pattern of NAME_EXCEPTION_PATTERNS) {
    if (pattern.test(locationName)) {
      return null;
    }
  }

  for (const city of MAJOR_CITIES) {
    const cityLower = city.toLowerCase();

    // Skip if this is the actual city
    if (cityLower === actualCityLower) {
      continue;
    }

    // Check if the location name contains this other city
    // Use word boundary check to avoid false positives
    const regex = new RegExp(`\\b${cityLower}\\b`, 'i');
    if (regex.test(nameLower)) {
      // Check if actualCity is the prefecture for this city
      // e.g., "Sendai" in name with city="Miyagi" is valid (Sendai is in Miyagi)
      const prefecture = CITY_TO_PREFECTURE[cityLower];
      if (prefecture && prefecture === actualCityLower) {
        continue; // Skip - the city in name is in the prefecture listed
      }

      return city;
    }
  }

  return null;
}
