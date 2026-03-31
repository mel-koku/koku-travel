/**
 * Shared helper utilities for gap detectors.
 */

import type { ItineraryDay } from "@/types/itinerary";

/**
 * Get suggested alternative categories based on the dominant category.
 */
export function getSuggestedAlternatives(dominantCategory: string): string[] {
  const alternatives: Record<string, string[]> = {
    temple: ["garden", "shopping", "restaurant", "museum", "craft"],
    shrine: ["garden", "market", "restaurant", "nature", "craft"],
    museum: ["garden", "shopping", "cafe", "nature", "craft"],
    shopping: ["temple", "garden", "museum", "nature"],
    restaurant: ["temple", "garden", "museum", "nature"],
    garden: ["temple", "museum", "shopping", "cafe"],
    nature: ["temple", "museum", "shopping", "restaurant"],
    landmark: ["garden", "shopping", "restaurant", "museum"],
    onsen: ["temple", "garden", "nature", "cafe"],
    craft: ["temple", "garden", "museum", "shopping", "cafe"],
  };

  return alternatives[dominantCategory] ?? ["garden", "cafe", "shopping"];
}

/**
 * Format category name for display.
 */
export function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    temple: "temples",
    shrine: "shrines",
    museum: "museums",
    shopping: "shopping spots",
    restaurant: "restaurants",
    garden: "gardens",
    nature: "nature spots",
    landmark: "landmarks",
    cafe: "cafes",
    onsen: "onsen spots",
    bar: "bars",
    craft: "craft workshops",
  };

  return names[category] ?? category;
}

/**
 * Extract month/day/weekend info for a day in the itinerary.
 */
export function getDayDateInfo(
  day: ItineraryDay,
  dayIndex: number,
  tripStartDate?: string,
): { month?: number; dayOfMonth?: number; isWeekend?: boolean } {
  // Prefer dateLabel from the day itself
  const dateStr = day.dateLabel ?? (tripStartDate ? addDays(tripStartDate, dayIndex) : undefined);
  if (!dateStr) return {};

  const parts = dateStr.split("-");
  const year = parseInt(parts[0] ?? "0", 10);
  const month = parseInt(parts[1] ?? "0", 10);
  const dayOfMonth = parseInt(parts[2] ?? "0", 10);

  // Use local date constructor to avoid UTC offset issue
  const date = new Date(year, month - 1, dayOfMonth);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return { month, dayOfMonth, isWeekend };
}

export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split("-");
  const d = new Date(
    parseInt(parts[0] ?? "0", 10),
    parseInt(parts[1] ?? "0", 10) - 1,
    parseInt(parts[2] ?? "0", 10) + days,
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
