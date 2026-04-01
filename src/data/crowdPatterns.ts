/**
 * Crowd Intelligence Data
 *
 * Hourly crowd curves per category + location overrides + holiday multipliers.
 * Used by scoreCrowdFit() in locationScoring.ts and crowd_alert gap detection.
 *
 * Crowd levels: 1 (empty) to 5 (packed)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HourlyPattern = Record<number, number>; // hour (6-23) → crowd level 1-5

export interface CrowdOverride {
  locationId: string;
  name: string;
  pattern: HourlyPattern;
  peakWarning?: string; // Shown as crowd tip
}

export interface HolidayPeriod {
  id: string;
  name: string;
  nameJa: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  crowdMultiplier: number; // 1.0 = normal, 2.0 = double
  description: string;
}

// ---------------------------------------------------------------------------
// Category Defaults (hourly crowd curves)
// ---------------------------------------------------------------------------

const MORNING_PEAK: HourlyPattern = {
  6: 1, 7: 2, 8: 3, 9: 4, 10: 5, 11: 5, 12: 4, 13: 3, 14: 3, 15: 2, 16: 2, 17: 2, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1,
};

const MIDDAY_PEAK: HourlyPattern = {
  6: 1, 7: 1, 8: 2, 9: 2, 10: 3, 11: 4, 12: 5, 13: 5, 14: 4, 15: 3, 16: 3, 17: 2, 18: 2, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1,
};

const AFTERNOON_PEAK: HourlyPattern = {
  6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 3, 12: 3, 13: 4, 14: 5, 15: 5, 16: 4, 17: 3, 18: 2, 19: 2, 20: 1, 21: 1, 22: 1, 23: 1,
};

const EVENING_PEAK: HourlyPattern = {
  6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 2, 12: 2, 13: 2, 14: 2, 15: 2, 16: 3, 17: 4, 18: 5, 19: 5, 20: 4, 21: 3, 22: 2, 23: 1,
};

const FLAT_MODERATE: HourlyPattern = {
  6: 1, 7: 1, 8: 2, 9: 2, 10: 3, 11: 3, 12: 3, 13: 3, 14: 3, 15: 3, 16: 3, 17: 3, 18: 2, 19: 2, 20: 1, 21: 1, 22: 1, 23: 1,
};

const LATE_NIGHT: HourlyPattern = {
  6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 2, 18: 3, 19: 4, 20: 5, 21: 5, 22: 4, 23: 3,
};

export const CATEGORY_CROWD_PATTERNS: Record<string, HourlyPattern> = {
  shrine: MORNING_PEAK,
  temple: MORNING_PEAK,
  garden: MORNING_PEAK,
  landmark: MIDDAY_PEAK,
  castle: MIDDAY_PEAK,
  museum: MIDDAY_PEAK,
  culture: MIDDAY_PEAK,
  historic_site: MIDDAY_PEAK,
  restaurant: MIDDAY_PEAK,
  cafe: MIDDAY_PEAK,
  market: MORNING_PEAK,
  park: AFTERNOON_PEAK,
  nature: AFTERNOON_PEAK,
  viewpoint: AFTERNOON_PEAK,
  beach: AFTERNOON_PEAK,
  shopping: AFTERNOON_PEAK,
  entertainment: EVENING_PEAK,
  bar: LATE_NIGHT,
  theater: EVENING_PEAK,
  onsen: EVENING_PEAK,
  wellness: FLAT_MODERATE,
  aquarium: MIDDAY_PEAK,
  zoo: MIDDAY_PEAK,
  craft: FLAT_MODERATE,
};

// ---------------------------------------------------------------------------
// High-Traffic Location Overrides
// ---------------------------------------------------------------------------

export const CROWD_OVERRIDES: CrowdOverride[] = [
  // Tokyo
  { locationId: "sensoji-temple", name: "Sensoji Temple", pattern: { 6: 2, 7: 3, 8: 4, 9: 5, 10: 5, 11: 5, 12: 5, 13: 5, 14: 5, 15: 4, 16: 4, 17: 3, 18: 2, 19: 2, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Visit before 7:00 for a peaceful experience" },
  { locationId: "meiji-shrine", name: "Meiji Shrine", pattern: { 6: 1, 7: 2, 8: 3, 9: 4, 10: 5, 11: 5, 12: 4, 13: 4, 14: 4, 15: 3, 16: 3, 17: 2, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Early morning offers the most tranquil visit" },
  { locationId: "tsukiji-outer-market", name: "Tsukiji Outer Market", pattern: { 6: 3, 7: 4, 8: 5, 9: 5, 10: 5, 11: 5, 12: 4, 13: 3, 14: 2, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Arrive before 8:00. Many stalls sell out by noon" },
  { locationId: "teamlab-borderless", name: "teamLab Borderless", pattern: { 6: 1, 7: 1, 8: 1, 9: 2, 10: 4, 11: 5, 12: 5, 13: 5, 14: 5, 15: 5, 16: 4, 17: 4, 18: 3, 19: 3, 20: 2, 21: 1, 22: 1, 23: 1 }, peakWarning: "Book earliest time slot. Crowds build quickly after 10:00" },
  { locationId: "shibuya-crossing", name: "Shibuya Crossing", pattern: { 6: 1, 7: 2, 8: 3, 9: 3, 10: 4, 11: 4, 12: 5, 13: 5, 14: 5, 15: 5, 16: 5, 17: 5, 18: 5, 19: 5, 20: 4, 21: 4, 22: 3, 23: 2 }, peakWarning: "Most photogenic at dusk with neon lights" },
  { locationId: "tokyo-skytree", name: "Tokyo Skytree", pattern: { 6: 1, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5, 12: 5, 13: 5, 14: 5, 15: 4, 16: 4, 17: 4, 18: 3, 19: 3, 20: 2, 21: 1, 22: 1, 23: 1 }, peakWarning: "Weekday mornings are the quietest" },
  { locationId: "harajuku-takeshita", name: "Takeshita Street", pattern: { 6: 1, 7: 1, 8: 1, 9: 2, 10: 3, 11: 4, 12: 5, 13: 5, 14: 5, 15: 5, 16: 4, 17: 3, 18: 2, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Weekday mornings before 10:00 are manageable" },

  // Kyoto
  { locationId: "fushimi-inari", name: "Fushimi Inari Shrine", pattern: { 6: 2, 7: 3, 8: 4, 9: 5, 10: 5, 11: 5, 12: 5, 13: 4, 14: 4, 15: 4, 16: 3, 17: 3, 18: 2, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "The higher trails thin out significantly. Keep climbing" },
  { locationId: "kinkaku-ji", name: "Kinkaku-ji", pattern: { 6: 1, 7: 1, 8: 2, 9: 4, 10: 5, 11: 5, 12: 5, 13: 5, 14: 4, 15: 4, 16: 3, 17: 2, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "First entry at 9:00 gives you 15 quiet minutes" },
  { locationId: "arashiyama-bamboo", name: "Arashiyama Bamboo Grove", pattern: { 6: 1, 7: 2, 8: 3, 9: 5, 10: 5, 11: 5, 12: 5, 13: 5, 14: 5, 15: 4, 16: 3, 17: 2, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Be there at dawn. By 9:00 it's shoulder-to-shoulder" },
  { locationId: "kiyomizu-dera", name: "Kiyomizu-dera", pattern: { 6: 2, 7: 3, 8: 4, 9: 5, 10: 5, 11: 5, 12: 5, 13: 5, 14: 5, 15: 4, 16: 4, 17: 3, 18: 2, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Opens at 6:00. Early morning is magical" },
  { locationId: "nishiki-market", name: "Nishiki Market", pattern: { 6: 1, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5, 12: 5, 13: 5, 14: 4, 15: 3, 16: 2, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Narrow aisles get packed by 11:00" },

  // Osaka
  { locationId: "dotonbori", name: "Dotonbori", pattern: { 6: 1, 7: 1, 8: 1, 9: 1, 10: 2, 11: 3, 12: 4, 13: 4, 14: 4, 15: 4, 16: 5, 17: 5, 18: 5, 19: 5, 20: 5, 21: 4, 22: 3, 23: 2 }, peakWarning: "Neon photo ops are best after dark" },
  { locationId: "osaka-castle", name: "Osaka Castle", pattern: { 6: 1, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5, 12: 5, 13: 5, 14: 4, 15: 4, 16: 3, 17: 2, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Cherry blossom season triples the crowds" },

  // Nara
  { locationId: "nara-park", name: "Nara Park", pattern: { 6: 1, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5, 12: 5, 13: 5, 14: 5, 15: 4, 16: 3, 17: 2, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Morning deer are calmer and less aggressive" },
  { locationId: "todai-ji", name: "Todai-ji", pattern: { 6: 1, 7: 2, 8: 3, 9: 4, 10: 5, 11: 5, 12: 5, 13: 5, 14: 4, 15: 4, 16: 3, 17: 2, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "School trip groups flood in by 10:00" },

  // Hiroshima
  { locationId: "itsukushima-shrine", name: "Itsukushima Shrine", pattern: { 6: 1, 7: 2, 8: 3, 9: 4, 10: 5, 11: 5, 12: 5, 13: 5, 14: 5, 15: 4, 16: 3, 17: 3, 18: 2, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Low tide reveals the torii base. Check tide tables" },

  // Kamakura
  { locationId: "kamakura-daibutsu", name: "Kamakura Great Buddha", pattern: { 6: 1, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5, 12: 5, 13: 5, 14: 4, 15: 3, 16: 2, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Weekday mornings are the calmest" },

  // Hakone
  { locationId: "hakone-open-air", name: "Hakone Open-Air Museum", pattern: { 6: 1, 7: 1, 8: 1, 9: 2, 10: 3, 11: 4, 12: 5, 13: 5, 14: 5, 15: 4, 16: 3, 17: 2, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Arrive at opening for the best experience" },

  // Nikko
  { locationId: "toshogu-shrine", name: "Nikko Toshogu", pattern: { 6: 1, 7: 2, 8: 3, 9: 4, 10: 5, 11: 5, 12: 5, 13: 5, 14: 4, 15: 3, 16: 2, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Tour buses arrive around 10:00. Go earlier" },

  // Kanazawa
  { locationId: "kenroku-en", name: "Kenroku-en Garden", pattern: { 6: 1, 7: 2, 8: 3, 9: 4, 10: 5, 11: 5, 12: 5, 13: 4, 14: 4, 15: 3, 16: 3, 17: 2, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Early morning entry is free before 8:00 in spring/summer" },

  // Takayama
  { locationId: "takayama-morning-market", name: "Takayama Morning Market", pattern: { 6: 2, 7: 3, 8: 4, 9: 5, 10: 5, 11: 4, 12: 3, 13: 2, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 }, peakWarning: "Vendors start packing up after 11:00" },
];

// Build a lookup map for quick access
export const CROWD_OVERRIDE_MAP = new Map(
  CROWD_OVERRIDES.map((o) => [o.locationId, o])
);

// ---------------------------------------------------------------------------
// Holiday Periods
// ---------------------------------------------------------------------------

export const HOLIDAY_PERIODS: HolidayPeriod[] = [
  {
    id: "new-year",
    name: "New Year (Shogatsu)",
    nameJa: "正月",
    startMonth: 12,
    startDay: 28,
    endMonth: 1,
    endDay: 4,
    crowdMultiplier: 1.8,
    description: "Many businesses close Dec 31–Jan 3. Temples packed for hatsumode.",
  },
  {
    id: "golden-week",
    name: "Golden Week",
    nameJa: "ゴールデンウィーク",
    startMonth: 4,
    startDay: 29,
    endMonth: 5,
    endDay: 5,
    crowdMultiplier: 2.0,
    description: "Japan's busiest travel week. Book transport and accommodation well in advance.",
  },
  {
    id: "obon",
    name: "Obon Festival",
    nameJa: "お盆",
    startMonth: 8,
    startDay: 11,
    endMonth: 8,
    endDay: 16,
    crowdMultiplier: 1.7,
    description: "Many locals return to hometowns. Transport is crowded, some businesses close.",
  },
  {
    id: "silver-week",
    name: "Silver Week",
    nameJa: "シルバーウィーク",
    startMonth: 9,
    startDay: 19,
    endMonth: 9,
    endDay: 23,
    crowdMultiplier: 1.5,
    description: "Autumn holiday cluster. Popular season for domestic travel.",
  },
  {
    id: "spring-school",
    name: "Spring School Holiday",
    nameJa: "春休み",
    startMonth: 3,
    startDay: 25,
    endMonth: 4,
    endDay: 7,
    crowdMultiplier: 1.4,
    description: "Overlaps with cherry blossom season. Family destinations are especially busy.",
  },
  {
    id: "summer-school",
    name: "Summer School Holiday",
    nameJa: "夏休み",
    startMonth: 7,
    startDay: 20,
    endMonth: 8,
    endDay: 31,
    crowdMultiplier: 1.3,
    description: "Families travel throughout. Beach and mountain destinations peak.",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get crowd level (1-5) for a location at a given hour, accounting for holidays.
 */
export function getCrowdLevel(
  category: string,
  hour: number,
  options?: {
    locationId?: string;
    month?: number;
    day?: number;
    isWeekend?: boolean;
  }
): number {
  const override = options?.locationId
    ? CROWD_OVERRIDE_MAP.get(options.locationId)
    : undefined;

  const pattern = override?.pattern ?? CATEGORY_CROWD_PATTERNS[category] ?? FLAT_MODERATE;
  const clampedHour = Math.max(6, Math.min(23, hour));
  let level = pattern[clampedHour] ?? 2;

  // Weekend bump
  if (options?.isWeekend) {
    level = Math.min(5, level + 1);
  }

  // Holiday multiplier
  if (options?.month && options?.day) {
    const multiplier = getHolidayMultiplier(options.month, options.day);
    if (multiplier > 1) {
      level = Math.min(5, Math.round(level * multiplier));
    }
  }

  return level;
}

/**
 * Get the peak warning text for a location if it has one.
 */
export function getCrowdWarning(locationId: string): string | undefined {
  return CROWD_OVERRIDE_MAP.get(locationId)?.peakWarning;
}

/**
 * Check if a date falls in a holiday period. Returns the multiplier or 1.0.
 */
export function getHolidayMultiplier(month: number, day: number): number {
  for (const holiday of HOLIDAY_PERIODS) {
    if (isInPeriod(month, day, holiday.startMonth, holiday.startDay, holiday.endMonth, holiday.endDay)) {
      return holiday.crowdMultiplier;
    }
  }
  return 1.0;
}

/**
 * Get active holidays for a trip date range.
 */
export function getActiveHolidays(
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number
): HolidayPeriod[] {
  return HOLIDAY_PERIODS.filter((h) => periodsOverlap(
    startMonth, startDay, endMonth, endDay,
    h.startMonth, h.startDay, h.endMonth, h.endDay
  ));
}

// Internal helpers
function isInPeriod(
  month: number, day: number,
  startMonth: number, startDay: number,
  endMonth: number, endDay: number
): boolean {
  const d = month * 100 + day;
  const s = startMonth * 100 + startDay;
  const e = endMonth * 100 + endDay;

  if (s <= e) {
    return d >= s && d <= e;
  }
  // Wraps around year boundary (e.g., Dec 28 – Jan 4)
  return d >= s || d <= e;
}

function periodsOverlap(
  m1s: number, d1s: number, m1e: number, d1e: number,
  m2s: number, d2s: number, m2e: number, d2e: number
): boolean {
  // Simplified: check if any day in period 1 falls in period 2 or vice versa
  return (
    isInPeriod(m1s, d1s, m2s, d2s, m2e, d2e) ||
    isInPeriod(m1e, d1e, m2s, d2s, m2e, d2e) ||
    isInPeriod(m2s, d2s, m1s, d1s, m1e, d1e) ||
    isInPeriod(m2e, d2e, m1s, d1s, m1e, d1e)
  );
}
