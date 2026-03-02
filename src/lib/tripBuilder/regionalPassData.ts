/**
 * Regional JR Pass Data
 *
 * ~15 regional passes with coverage areas, prices, and durations.
 * Used by the regional pass calculator to evaluate cost savings.
 */

import type { KnownCityId } from "@/types/trip";

export interface RegionalPass {
  id: string;
  name: string;
  nameJa: string;
  days: number;
  price: number; // JPY (tourist/green car where applicable)
  coverageCities: KnownCityId[];
  operator: string;
  includesBus?: boolean;
  includesSubway?: boolean;
  notes?: string;
}

export const REGIONAL_PASSES: readonly RegionalPass[] = [
  // Kansai Area
  {
    id: "kansai-area-1",
    name: "Kansai Area Pass (1-day)",
    nameJa: "関西エリアパス",
    days: 1,
    price: 2400,
    coverageCities: ["osaka", "kyoto", "kobe", "nara"],
    operator: "JR West",
    notes: "Covers JR lines in Kansai area. No shinkansen.",
  },
  {
    id: "kansai-area-2",
    name: "Kansai Area Pass (2-day)",
    nameJa: "関西エリアパス",
    days: 2,
    price: 4600,
    coverageCities: ["osaka", "kyoto", "kobe", "nara"],
    operator: "JR West",
  },
  {
    id: "kansai-area-3",
    name: "Kansai Area Pass (3-day)",
    nameJa: "関西エリアパス",
    days: 3,
    price: 5600,
    coverageCities: ["osaka", "kyoto", "kobe", "nara"],
    operator: "JR West",
  },
  {
    id: "kansai-area-4",
    name: "Kansai Area Pass (4-day)",
    nameJa: "関西エリアパス",
    days: 4,
    price: 6800,
    coverageCities: ["osaka", "kyoto", "kobe", "nara"],
    operator: "JR West",
  },
  {
    id: "kansai-wide",
    name: "Kansai Wide Area Pass (5-day)",
    nameJa: "関西ワイドエリアパス",
    days: 5,
    price: 12000,
    coverageCities: ["osaka", "kyoto", "kobe", "nara", "hiroshima"],
    operator: "JR West",
    notes: "Includes shinkansen to Okayama and Kurashiki",
  },

  // Hokuriku
  {
    id: "hokuriku-arch",
    name: "Hokuriku Arch Pass (7-day)",
    nameJa: "北陸アーチパス",
    days: 7,
    price: 30000,
    coverageCities: ["tokyo", "kanazawa", "kyoto", "osaka"],
    operator: "JR East/West",
    notes: "Tokyo–Kanazawa–Kyoto–Osaka via Hokuriku Shinkansen",
  },

  // Tohoku / Nagano
  {
    id: "jr-east-tohoku",
    name: "JR East Tohoku Area Pass (5-day)",
    nameJa: "JR東日本パス（東北エリア）",
    days: 5,
    price: 30000,
    coverageCities: ["tokyo"],
    operator: "JR East",
    notes: "Covers all JR East lines including Tohoku Shinkansen",
  },
  {
    id: "jr-east-nagano",
    name: "JR East Nagano/Niigata Pass (5-day)",
    nameJa: "JR東日本パス（長野・新潟エリア）",
    days: 5,
    price: 27000,
    coverageCities: ["tokyo", "nagano"],
    operator: "JR East",
    notes: "Covers Hokuriku Shinkansen to Nagano and JR lines to Niigata",
  },

  // Hokkaido
  {
    id: "hokkaido-pass-5",
    name: "Hokkaido Rail Pass (5-day)",
    nameJa: "北海道レールパス",
    days: 5,
    price: 20000,
    coverageCities: ["sapporo", "hakodate"],
    operator: "JR Hokkaido",
    notes: "All JR Hokkaido trains including limited express",
  },
  {
    id: "hokkaido-pass-7",
    name: "Hokkaido Rail Pass (7-day)",
    nameJa: "北海道レールパス",
    days: 7,
    price: 26000,
    coverageCities: ["sapporo", "hakodate"],
    operator: "JR Hokkaido",
  },

  // Kyushu
  {
    id: "kyushu-pass-3",
    name: "JR Kyushu Rail Pass (3-day)",
    nameJa: "JR九州レールパス",
    days: 3,
    price: 16000,
    coverageCities: ["fukuoka"],
    operator: "JR Kyushu",
    notes: "All JR Kyushu trains including Kyushu Shinkansen",
  },
  {
    id: "kyushu-pass-5",
    name: "JR Kyushu Rail Pass (5-day)",
    nameJa: "JR九州レールパス",
    days: 5,
    price: 18500,
    coverageCities: ["fukuoka"],
    operator: "JR Kyushu",
  },

  // Shikoku
  {
    id: "shikoku-pass-3",
    name: "All Shikoku Rail Pass (3-day)",
    nameJa: "四国フリーきっぷ",
    days: 3,
    price: 12000,
    coverageCities: [],
    operator: "JR Shikoku",
    notes: "All JR Shikoku lines and some private railways",
  },

  // Hakone
  {
    id: "hakone-freepass-2",
    name: "Hakone Free Pass (2-day)",
    nameJa: "箱根フリーパス",
    days: 2,
    price: 6100,
    coverageCities: ["hakone"],
    operator: "Odakyu",
    includesBus: true,
    notes: "Includes all Hakone transport (bus, ropeway, pirate ship, cable car) from Shinjuku",
  },
  {
    id: "hakone-freepass-3",
    name: "Hakone Free Pass (3-day)",
    nameJa: "箱根フリーパス",
    days: 3,
    price: 6500,
    coverageCities: ["hakone"],
    operator: "Odakyu",
    includesBus: true,
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find regional passes that cover a set of cities.
 * A pass "covers" a city set if the pass's coverageCities includes all of them.
 */
export function findCoveringPasses(cities: KnownCityId[], daysNeeded: number): RegionalPass[] {
  const citySet = new Set(cities);
  return REGIONAL_PASSES.filter((pass) => {
    if (pass.days < daysNeeded) return false;
    // At least one planned city must be in the pass coverage
    return pass.coverageCities.some((c) => citySet.has(c));
  });
}

/**
 * Calculate regional pass recommendations for a trip.
 * Returns passes sorted by coverage match (most cities covered first).
 */
export function calculateRegionalPassRecommendations(
  cities: KnownCityId[],
  tripDuration: number,
): { pass: RegionalPass; coveredCities: KnownCityId[]; coverageRatio: number }[] {
  const citySet = new Set(cities);
  const candidates = REGIONAL_PASSES.filter((pass) => pass.days <= tripDuration);

  return candidates
    .map((pass) => {
      const covered = pass.coverageCities.filter((c) => citySet.has(c));
      return {
        pass,
        coveredCities: covered,
        coverageRatio: covered.length / cities.length,
      };
    })
    .filter((r) => r.coveredCities.length > 0)
    .sort((a, b) => b.coverageRatio - a.coverageRatio);
}
