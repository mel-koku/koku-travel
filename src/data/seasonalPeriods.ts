import type { WeatherRegion } from "./regions";

export type SeasonName = "cherryBlossom" | "rainy" | "autumnLeaves" | "summer" | "winter";

export type SeasonalPeriod = {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  title: string;
  message: string;
};

/**
 * Region-keyed seasonal data. `null` means "this season does not apply in
 * this region" (e.g., tsuyu in Hokkaido). Sources: JNTO seasonal guidance,
 * official Japan tourism boards.
 *
 * Date ranges are best-fit averages, not promises. UI copy hedges with
 * "around" or "typically" to absorb year-to-year variance.
 */
const PERIODS: Record<SeasonName, Partial<Record<WeatherRegion, SeasonalPeriod>>> = {
  cherryBlossom: {
    temperate: {
      startMonth: 3, startDay: 20, endMonth: 4, endDay: 15,
      title: "Cherry Blossom Season",
      message: "Perfect timing for cherry blossoms (sakura). We'll include the best hanami spots in your itinerary.",
    },
    tropical_south: {
      startMonth: 1, startDay: 18, endMonth: 2, endDay: 28,
      title: "Cherry Blossom Season (Okinawa)",
      message: "Okinawa's sakura bloom early. Mount Yaedake and Nakijin Castle are typical viewing spots.",
    },
    subarctic_north: {
      startMonth: 4, startDay: 25, endMonth: 5, endDay: 15,
      title: "Cherry Blossom Season (Hokkaido)",
      message: "Hokkaido's sakura bloom 4-6 weeks after Tokyo. Goryokaku Park in Hakodate is a classic viewing spot.",
    },
  },
  rainy: {
    temperate: {
      startMonth: 6, startDay: 1, endMonth: 7, endDay: 20,
      title: "Rainy Season (Tsuyu)",
      message: "You're traveling during rainy season. We'll prioritize indoor activities and suggest backup options for outdoor plans.",
    },
    tropical_south: {
      startMonth: 5, startDay: 10, endMonth: 6, endDay: 25,
      title: "Rainy Season (Okinawa)",
      message: "Okinawa's rainy season runs roughly mid-May through June, earlier than mainland Japan. Pack a light rain layer and plan flexible indoor backups.",
    },
    // subarctic_north intentionally omitted: Hokkaido has no tsuyu
  },
  autumnLeaves: {
    temperate: {
      startMonth: 10, startDay: 15, endMonth: 11, endDay: 30,
      title: "Autumn Leaves Season",
      message: "Great timing for autumn colors (koyo). We'll suggest gardens and temples known for fall foliage.",
    },
    subarctic_north: {
      startMonth: 9, startDay: 20, endMonth: 10, endDay: 25,
      title: "Autumn Leaves Season (Hokkaido)",
      message: "Hokkaido's koyo arrives weeks earlier than the mainland. Daisetsuzan and Sounkyo Gorge peak in late September.",
    },
    tropical_south: {
      startMonth: 11, startDay: 15, endMonth: 12, endDay: 31,
      title: "Late Autumn (Okinawa)",
      message: "Okinawa doesn't have a strong koyo season. Expect mild weather and quieter beaches.",
    },
  },
  summer: {
    temperate: {
      startMonth: 7, startDay: 21, endMonth: 8, endDay: 31,
      title: "Summer Heat",
      message: "Japanese summers can be hot and humid. We'll balance outdoor activities with air-conditioned spots and suggest early morning visits.",
    },
    tropical_south: {
      startMonth: 6, startDay: 26, endMonth: 9, endDay: 30,
      title: "Summer & Typhoon Season (Okinawa)",
      message: "Hot, humid, and exposed to typhoons from June through September. Build flexible plans and check forecasts daily.",
    },
    subarctic_north: {
      startMonth: 7, startDay: 1, endMonth: 8, endDay: 25,
      title: "Hokkaido Summer",
      message: "Hokkaido's summer is the mildest in Japan: low humidity, comfortable temperatures, and lavender season in Furano.",
    },
  },
  winter: {
    temperate: {
      startMonth: 12, startDay: 15, endMonth: 2, endDay: 28,
      title: "Winter Season",
      message: "Great time for onsen (hot springs) and winter illuminations. Some mountain areas may have limited access due to snow.",
    },
    subarctic_north: {
      startMonth: 11, startDay: 25, endMonth: 3, endDay: 31,
      title: "Hokkaido Winter",
      message: "Heavy snow, deep powder for skiing in Niseko and Furano, and the Sapporo Snow Festival in early February. Pack serious winter gear.",
    },
    tropical_south: {
      startMonth: 12, startDay: 15, endMonth: 2, endDay: 28,
      title: "Mild Winter (Okinawa)",
      message: "Okinawa's winter is mild (15-20°C) and dry. Whale watching season runs January through March.",
    },
  },
};

export function getSeasonalPeriod(
  season: SeasonName,
  region: WeatherRegion,
): SeasonalPeriod | null {
  return PERIODS[season][region] ?? null;
}
