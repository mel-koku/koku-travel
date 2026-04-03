import type { CityId, EntryPoint } from "../types/trip";
import { getNearestCity, getCityCenterCoordinates } from "@/data/entryPoints";
import { calculateDistanceMeters } from "@/lib/utils/geoUtils";

/**
 * Travel time matrix in minutes between known cities.
 * Values represent typical shinkansen / limited express / transit times.
 * Only one direction needs to be defined — lookup falls back to inverse.
 */
const MATRIX: Record<CityId, Partial<Record<CityId, number>>> = {
  // Kansai cluster
  kyoto: { osaka: 30, nara: 45, kobe: 50, otsu: 10, tokyo: 135, nagoya: 35, hiroshima: 100, kanazawa: 130, fukuoka: 175 },
  osaka: { nara: 40, kobe: 25, otsu: 40, tokyo: 150, nagoya: 55, hiroshima: 90, fukuoka: 155, kanazawa: 155, tokushima: 170 },
  nara: { kobe: 70, otsu: 55 },
  kobe: { hiroshima: 70, fukuoka: 135 },
  otsu: {},
  himeji: { osaka: 55, kobe: 40, okayama: 20, kyoto: 75, hiroshima: 65 },
  wakayama: { osaka: 80, nara: 90, kobe: 90 },
  // Kanto cluster
  tokyo: { yokohama: 25, kamakura: 55, nikko: 120, hakone: 80, nagoya: 100, sendai: 100, kanazawa: 155, sapporo: 250 /* flight + transfer */, hakodate: 240, niigata: 120, nagano: 85, hiroshima: 240, fukuoka: 300, morioka: 130, aomori: 195 },
  yokohama: { kamakura: 25, hakone: 60, nagoya: 80 },
  kamakura: { hakone: 90 },
  nikko: {},
  hakone: { nagoya: 120 },
  kawaguchiko: { tokyo: 120, hakone: 90 },
  // Chubu
  nagoya: { kanazawa: 180, takayama: 140, nagano: 180, hiroshima: 150 },
  takayama: { kanazawa: 180, nagano: 180 },
  nagano: { kanazawa: 120, niigata: 90 },
  niigata: { sendai: 180 },
  ise: { nagoya: 90, osaka: 140 },
  toyama: { kanazawa: 40, nagoya: 180, tokyo: 130 },
  // Kyushu
  fukuoka: { nagasaki: 115, kumamoto: 45, kagoshima: 80, oita: 85, hiroshima: 65, matsuyama: 195 },
  nagasaki: { kumamoto: 120 },
  kumamoto: { kagoshima: 50, oita: 120 },
  kagoshima: {},
  oita: {},
  miyazaki: { kumamoto: 160, kagoshima: 120, oita: 180, fukuoka: 240 },
  kitakyushu: { fukuoka: 20, hiroshima: 50, shimonoseki: 15 },
  // Hokkaido
  sapporo: { hakodate: 210 },
  hakodate: { aomori: 65 },
  // Tohoku
  sendai: { hakodate: 180, sapporo: 270 /* flight + transfer */, morioka: 45, akita: 100 },
  morioka: { aomori: 100, akita: 100, hakodate: 150 },
  aomori: { akita: 140 },
  akita: {},
  yamagata: { sendai: 60, morioka: 120 },
  aizuwakamatsu: { sendai: 100, niigata: 120, tokyo: 170 },
  // Chugoku
  hiroshima: { takamatsu: 180, okayama: 40, matsue: 210 },
  okayama: { takamatsu: 55, matsue: 160, tottori: 120, osaka: 50 },
  matsue: { tottori: 120 },
  tottori: { osaka: 160 },
  shimonoseki: { hiroshima: 70, fukuoka: 25 },
  // Shikoku
  matsuyama: { hiroshima: 160, takamatsu: 155, kochi: 150, osaka: 240 },
  takamatsu: { osaka: 105, okayama: 55, tokushima: 70, kochi: 120 },
  tokushima: { kochi: 120 },
  kochi: {},
  iyavalley: { takamatsu: 120, tokushima: 90, kochi: 150 },
  // Okinawa (flight-only — all times are flight + transfer)
  naha: { tokyo: 180, osaka: 165, fukuoka: 120, nagoya: 170, sapporo: 240, sendai: 200, nagasaki: 135, kagoshima: 90, ishigaki: 90 },
  ishigaki: {},
  // Hokuriku
  kanazawa: { hiroshima: 210, fukuoka: 240, sendai: 230 },
};

/**
 * Returns the approximate travel time in minutes between two cities.
 * Falls back to the inverse lookup if only one direction is defined.
 */
export function travelMinutes(a: CityId, b: CityId): number | undefined {
  if (a === b) return 0;
  return MATRIX[a]?.[b] ?? MATRIX[b]?.[a];
}


/**
 * Estimate travel time from an entry point to a city in minutes.
 * Prefers the known travel matrix (via the nearest city) over raw distance,
 * since crow-flies distance dramatically underestimates for mountain/inland
 * cities like Nikko and Nagano.
 */
export function travelTimeFromEntryPoint(
  entryPoint: EntryPoint,
  cityId: CityId,
): number | undefined {
  // If entry point already has a city ID and it matches, return 0
  if (entryPoint.cityId === cityId) {
    return 0;
  }

  const airportBuffer = entryPoint.type === "airport" ? 30 : 0;

  // Prefer the travel matrix when we know the nearest city
  if (entryPoint.cityId) {
    const matrixTime = travelMinutes(entryPoint.cityId, cityId);
    if (matrixTime !== undefined) {
      return matrixTime + airportBuffer;
    }
  }

  // Fallback: distance-based estimation
  const cityCoords = getCityCenterCoordinates(cityId);
  const distanceMeters = calculateDistanceMeters(entryPoint.coordinates, cityCoords);

  const averageSpeedKmh = distanceMeters > 100000 ? 200 : 60;
  const distanceKm = distanceMeters / 1000;
  const hours = distanceKm / averageSpeedKmh;
  const minutes = Math.round(hours * 60);

  return minutes + airportBuffer;
}

/**
 * Get the nearest city to an entry point.
 * Prefers the explicit cityId when set (e.g. HND → "tokyo"),
 * falling back to geographic distance.
 */
export function getNearestCityToEntryPoint(entryPoint: EntryPoint): CityId | undefined {
  if (entryPoint.cityId) {
    return entryPoint.cityId;
  }
  return getNearestCity(entryPoint.coordinates);
}


