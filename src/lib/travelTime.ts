import type { CityId } from "../types/trip";

const MATRIX: Record<CityId, Partial<Record<CityId, number>>> = {
  kyoto: { osaka: 30, nara: 45, tokyo: 150 },
  osaka: { kyoto: 30, nara: 45, tokyo: 150 },
  nara: { kyoto: 45, osaka: 45, tokyo: 180 },
  tokyo: { kyoto: 150, osaka: 150, yokohama: 25 },
  yokohama: { tokyo: 25 },
};

/**
 * Returns the approximate travel time in minutes between two cities.
 * Falls back to the inverse lookup if only one direction is defined.
 */
export function travelMinutes(a: CityId, b: CityId): number | undefined {
  if (a === b) return 0;
  return MATRIX[a]?.[b] ?? MATRIX[b]?.[a];
}


