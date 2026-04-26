/**
 * Airport processing buffer utilities.
 *
 * Computes effective Day 1 start / last-day end times from flight
 * arrival/departure + customs/transit buffers.
 *
 * Buffer = airport processing (customs/check-in) + transit to/from city.
 * Transit times are per-airport lookups based on actual rail/bus durations.
 */

import { parseTimeToMinutes, formatMinutesToTime } from "./timeUtils";

/** International airports — used server-side where Airport objects aren't available. */
const INTERNATIONAL_IATA = new Set(["NRT", "KIX", "CTS", "FUK", "NGO", "OKA", "HND"]);

/**
 * Per-airport transit time (minutes) to the nearest major city center.
 * Based on standard express train / subway / monorail durations.
 */
const AIRPORT_TRANSIT_MINUTES: Record<string, number> = {
  NRT: 60,  // Narita Express → Tokyo Station (~55-60 min)
  HND: 25,  // Monorail → Hamamatsucho / Keikyu → Shinagawa
  KIX: 50,  // Haruka Express → Osaka (Tennoji)
  CTS: 40,  // JR Rapid Airport → Sapporo
  FUK: 10,  // Subway → Hakata
  NGO: 30,  // Meitetsu μ-SKY → Nagoya
  OKA: 20,  // Yui Rail → Naha (Kencho-mae)
  ITM: 25,  // Osaka Monorail + subway → Umeda (Itami)
  KMQ: 20,  // Bus → Kanazawa Station
  SDJ: 25,  // Access Express → Sendai
  HKD: 20,  // Shuttle → Hakodate Station
  KOJ: 40,  // Bus → Kagoshima-Chuo
  ASJ: 10,  // Bus → Amami city
  MMY: 15,  // Taxi/bus → Miyako center
  ISG: 15,  // Bus → Ishigaki center
  HIJ: 50,  // Limousine bus → Hiroshima Station
  MYJ: 20,  // Bus → Matsuyama
  TAK: 25,  // Bus → Takamatsu
  TKS: 25,  // Bus → Tokushima
  NGS: 45,  // Bus → Nagasaki Station
  KMJ: 50,  // Bus/train → Kumamoto Station
  OIT: 55,  // Bus → Beppu / Oita
  AOJ: 30,  // Bus → Aomori Station
};

/** Default transit for unknown domestic airports. */
const DEFAULT_DOMESTIC_TRANSIT = 30;
/** Default transit for unknown international airports. */
const DEFAULT_INTL_TRANSIT = 60;

/** Airport processing time after landing (immigration + customs + baggage). */
export function getArrivalProcessing(iataCode?: string): number {
  const isIntl = !iataCode || INTERNATIONAL_IATA.has(iataCode.toUpperCase());
  return isIntl ? 60 : 20;
}

/** Airport processing time before departure (check-in + security + immigration). */
export function getDepartureProcessing(iataCode?: string): number {
  const isIntl = !iataCode || INTERNATIONAL_IATA.has(iataCode.toUpperCase());
  return isIntl ? 120 : 60;
}

/** Transit time from airport to nearest city center. */
function getTransitTime(iataCode?: string): number {
  if (!iataCode) return DEFAULT_INTL_TRANSIT;
  const code = iataCode.toUpperCase();
  if (code in AIRPORT_TRANSIT_MINUTES) return AIRPORT_TRANSIT_MINUTES[code]!;
  return INTERNATIONAL_IATA.has(code) ? DEFAULT_INTL_TRANSIT : DEFAULT_DOMESTIC_TRANSIT;
}

/** Total minutes needed after landing before first activity. */
export function getArrivalBuffer(iataCode?: string): number {
  return getArrivalProcessing(iataCode) + getTransitTime(iataCode);
}

/** Total minutes needed before departure (last activity end → takeoff). */
export function getDepartureBuffer(iataCode?: string): number {
  return getDepartureProcessing(iataCode) + getTransitTime(iataCode);
}

/** Max effective start — cap late arrivals at 21:00 */
const MAX_EFFECTIVE_START = 21 * 60;
/** Min effective end — cap early departures at 08:00 */
const MIN_EFFECTIVE_END = 8 * 60;

/**
 * Compute the effective Day 1 start time given a flight landing time.
 * Returns HH:MM or null if arrivalTime is not provided / invalid.
 */
export function computeEffectiveArrivalStart(
  arrivalTime: string | undefined,
  iataCode?: string,
): string | null {
  const mins = parseTimeToMinutes(arrivalTime);
  if (mins === null) return null;
  const effective = Math.min(mins + getArrivalBuffer(iataCode), MAX_EFFECTIVE_START);
  return formatMinutesToTime(effective);
}

/**
 * Compute the effective last-day end time given a flight departure time.
 * Returns HH:MM or null if departureTime is not provided / invalid.
 */
export function computeEffectiveDepartureEnd(
  departureTime: string | undefined,
  iataCode?: string,
): string | null {
  const mins = parseTimeToMinutes(departureTime);
  if (mins === null) return null;
  const effective = Math.max(mins - getDepartureBuffer(iataCode), MIN_EFFECTIVE_END);
  return formatMinutesToTime(effective);
}

/** Effective arrival >= 19:00 means less than 1 usable hour before default day end (21:00). */
export const LATE_ARRIVAL_THRESHOLD = 19 * 60;

/**
 * Effective arrival before 08:00 (in minutes-of-day) means most shrines, museums,
 * and shops are still closed. Strip Day 1 and defer to the next reasonable hour.
 */
export const EARLY_ARRIVAL_THRESHOLD = 8 * 60;

/**
 * Compute the raw (uncapped) effective arrival time in minutes.
 * arrival + processing + transit — no MAX_EFFECTIVE_START cap.
 * Returns null if arrivalTime is not provided / invalid.
 */
export function computeRawEffectiveArrival(
  arrivalTime: string | undefined,
  iataCode?: string,
): number | null {
  const mins = parseTimeToMinutes(arrivalTime);
  if (mins === null) return null;
  return mins + getArrivalBuffer(iataCode);
}
