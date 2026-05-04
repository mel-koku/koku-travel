import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Deterministic festival extractor for Smart Guidebook content layer.
 *
 * The LLM pipeline injects festival rows into the prompt for any prose
 * field that touches `whenToCome` (region, city, neighborhood). Pulling them
 * via a separate deterministic step ensures the LLM references real festivals
 * by name and accurate months — it never has to invent festival data, and it
 * can't drop a festival the editorial team would expect to see.
 *
 * Source: `locations` table rows where `seasonal_type = 'festival'`. The
 * `valid_months` int[] column tells us which months the festival happens.
 *
 * No LLM in this file. Pure data layer.
 */

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export type FestivalRow = {
  id: string;
  name: string;
  /** e.g. "kyoto", "tokyo". Anchors the festival to a city. May be null for
   *  region-wide festivals. */
  planningCity: string | null;
  /** ISO region slug. */
  region: string | null;
  /** Months 1-12 when the festival runs. Empty array = unknown / year-round. */
  validMonths: number[];
  /** Editorial blurb if present in `editorial_summary`. */
  summary: string | null;
};

type LocationsTableRow = {
  id: string;
  name: string;
  planning_city: string | null;
  region: string | null;
  valid_months: number[] | null;
  editorial_summary: string | null;
};

function rowToFestival(r: LocationsTableRow): FestivalRow {
  return {
    id: r.id,
    name: r.name,
    planningCity: r.planning_city,
    region: r.region,
    validMonths: Array.isArray(r.valid_months) ? r.valid_months : [],
    summary: r.editorial_summary,
  };
}

/**
 * All festivals anchored to a given `planning_city`. Sorted by earliest
 * `valid_months` value so the prompt sees them in calendar order.
 */
export async function extractFestivalsForCity(
  client: SupabaseClient,
  planningCity: string,
): Promise<FestivalRow[]> {
  const { data, error } = await client
    .from("locations")
    .select("id, name, planning_city, region, valid_months, editorial_summary")
    .eq("is_active", true)
    .eq("seasonal_type", "festival")
    .eq("planning_city", planningCity);

  if (error) throw new Error(`festivalExtractor city query: ${error.message}`);
  return ((data ?? []) as LocationsTableRow[])
    .map(rowToFestival)
    .sort(byEarliestMonth);
}

/**
 * All festivals in a region (case-insensitive match on `region` column).
 * Sorted in calendar order.
 */
export async function extractFestivalsForRegion(
  client: SupabaseClient,
  region: string,
): Promise<FestivalRow[]> {
  const { data, error } = await client
    .from("locations")
    .select("id, name, planning_city, region, valid_months, editorial_summary")
    .eq("is_active", true)
    .eq("seasonal_type", "festival")
    .ilike("region", region);

  if (error)
    throw new Error(`festivalExtractor region query: ${error.message}`);
  return ((data ?? []) as LocationsTableRow[])
    .map(rowToFestival)
    .sort(byEarliestMonth);
}

function byEarliestMonth(a: FestivalRow, b: FestivalRow): number {
  const aMin = a.validMonths.length ? Math.min(...a.validMonths) : 13;
  const bMin = b.validMonths.length ? Math.min(...b.validMonths) : 13;
  if (aMin !== bMin) return aMin - bMin;
  return a.name.localeCompare(b.name);
}

function formatMonths(months: number[]): string {
  if (months.length === 0) return "year-round";
  if (months.length === 1) return MONTH_NAMES[months[0]! - 1] ?? "";
  // Detect contiguous range (e.g. [6,7,8] → "Jun-Aug"); else comma-list.
  const sorted = [...months].sort((a, b) => a - b);
  const isContiguous = sorted.every(
    (m, i) => i === 0 || m === sorted[i - 1]! + 1,
  );
  if (isContiguous) {
    return `${MONTH_NAMES[sorted[0]! - 1]}–${MONTH_NAMES[sorted[sorted.length - 1]! - 1]}`;
  }
  return sorted.map((m) => MONTH_NAMES[m - 1]).join(", ");
}

/**
 * Renders a festival list as a prompt-ready text block. The LLM is instructed
 * to reference these by name; if a festival isn't in this list, the LLM
 * shouldn't mention it. Empty input → empty string (caller checks length).
 */
export function formatFestivalsForPrompt(festivals: FestivalRow[]): string {
  if (festivals.length === 0) return "";
  return festivals
    .map((f) => {
      const months = formatMonths(f.validMonths);
      const summary = f.summary ? ` — ${f.summary}` : "";
      return `- ${f.name} (${months})${summary}`;
    })
    .join("\n");
}
