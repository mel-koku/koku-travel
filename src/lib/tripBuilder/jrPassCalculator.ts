import type { CityId } from "@/types/trip";

/**
 * JR Pass types with current pricing (as of 2024).
 * Prices are estimates and may change.
 */
export const JR_PASS_TYPES = [
  { name: "7-Day", days: 7, price: 50000 },
  { name: "14-Day", days: 14, price: 80000 },
  { name: "21-Day", days: 21, price: 100000 },
] as const;

/**
 * Approximate one-way shinkansen/express fares between major cities (¥).
 * Only one direction is defined — lookup falls back to inverse.
 */
const SHINKANSEN_FARES: Record<string, Partial<Record<string, number>>> = {
  tokyo: {
    osaka: 13870,
    kyoto: 13320,
    nagoya: 10560,
    hiroshima: 18380,
    fukuoka: 22220,
    sendai: 10890,
    kanazawa: 14380,
    yokohama: 1520,
    hakodate: 22690,
    sapporo: 27760,
    naha: 40000, // flight estimate
  },
  osaka: {
    kyoto: 580,
    kobe: 410,
    nara: 810,
    nagoya: 5940,
    hiroshima: 10010,
    fukuoka: 15400,
    kanazawa: 7790,
  },
  kyoto: {
    nara: 720,
    kobe: 1100,
    nagoya: 5170,
    hiroshima: 11420,
    kanazawa: 6940,
  },
  nagoya: {
    kanazawa: 7460,
  },
  fukuoka: {
    hiroshima: 8420,
    nagasaki: 5920,
  },
  sendai: {
    hakodate: 12190,
  },
  sapporo: {
    hakodate: 8910,
  },
};

function lookupFare(from: string, to: string): number | undefined {
  return SHINKANSEN_FARES[from]?.[to] ?? SHINKANSEN_FARES[to]?.[from];
}

export type JourneyLeg = {
  from: string;
  to: string;
  fare: number;
};

export type JRPassRecommendation = {
  /** Whether buying a JR Pass saves money */
  recommendation: "save" | "skip";
  /** Total cost of individual tickets */
  individualTotal: number;
  /** Cheapest JR Pass that covers the trip duration */
  passType: (typeof JR_PASS_TYPES)[number] | null;
  /** How much the traveler saves (negative = pass costs more) */
  savings: number;
  /** Breakdown of individual journey fares */
  journeys: JourneyLeg[];
};

/**
 * Calculate whether a JR Pass saves money for a given trip.
 *
 * @param duration - Trip duration in days
 * @param cities - Ordered list of city IDs visited
 * @returns Recommendation with savings breakdown
 */
export function calculateJRPassValue(
  duration: number,
  cities: CityId[],
): JRPassRecommendation {
  // Build journey legs from consecutive city pairs
  const journeys: JourneyLeg[] = [];
  for (let i = 0; i < cities.length - 1; i++) {
    const from = cities[i]!;
    const to = cities[i + 1]!;
    if (from === to) continue;

    const fare = lookupFare(from, to);
    if (fare !== undefined) {
      journeys.push({ from, to, fare });
    }
  }

  const individualTotal = journeys.reduce((sum, j) => sum + j.fare, 0);

  // Find cheapest pass that covers the duration
  const eligiblePasses = JR_PASS_TYPES.filter((p) => p.days >= duration);
  const passType = eligiblePasses[0] ?? null;

  if (!passType) {
    return {
      recommendation: "skip",
      individualTotal,
      passType: null,
      savings: 0,
      journeys,
    };
  }

  const savings = individualTotal - passType.price;

  return {
    recommendation: savings > 0 ? "save" : "skip",
    individualTotal,
    passType,
    savings,
    journeys,
  };
}
