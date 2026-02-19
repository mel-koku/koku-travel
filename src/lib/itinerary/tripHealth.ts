import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import type { Location } from "@/types/location";

export type DayHealth = {
  dayId: string;
  dayIndex: number;
  score: number; // 0-100
  issues: HealthIssue[];
};

export type HealthIssue = {
  type: "conflict" | "gap" | "checklist" | "accessibility";
  severity: "error" | "warning" | "info";
  message: string;
  activityTitle?: string;
  dayIndex: number;
};

export type ChecklistItem = {
  id: string;
  label: string;
  category: "reservation" | "cash" | "hours" | "transport" | "accessibility";
  dayIndex: number;
  activityTitle: string;
};

export type TripHealthResult = {
  overall: number; // 0-100
  days: DayHealth[];
  checklist: ChecklistItem[];
  totalIssues: number;
};

/**
 * Calculate trip health score from itinerary data and detected conflicts.
 * Pure function — no API calls.
 */
export function calculateTripHealth(
  itinerary: Itinerary,
  conflicts: ItineraryConflict[],
): TripHealthResult {
  const days: DayHealth[] = itinerary.days.map((day, dayIndex) => {
    const dayConflicts = conflicts.filter((c) => c.dayId === day.id);
    const issues: HealthIssue[] = [];
    let penalty = 0;

    // Conflict penalties
    for (const conflict of dayConflicts) {
      if (conflict.severity === "error") {
        penalty += 20;
        issues.push({
          type: "conflict",
          severity: "error",
          message: conflict.message,
          activityTitle: conflict.activityTitle,
          dayIndex,
        });
      } else if (conflict.severity === "warning") {
        penalty += 10;
        issues.push({
          type: "conflict",
          severity: "warning",
          message: conflict.message,
          activityTitle: conflict.activityTitle,
          dayIndex,
        });
      } else {
        penalty += 3;
        issues.push({
          type: "conflict",
          severity: "info",
          message: conflict.message,
          activityTitle: conflict.activityTitle,
          dayIndex,
        });
      }
    }

    // Activity count checks
    const placeActivities = day.activities.filter(
      (a): a is Extract<ItineraryActivity, { kind: "place" }> =>
        a.kind === "place",
    );

    if (placeActivities.length === 0) {
      penalty += 15;
      issues.push({
        type: "gap",
        severity: "warning",
        message: "No activities planned for this day.",
        dayIndex,
      });
    } else if (placeActivities.length > 7) {
      penalty += 10;
      issues.push({
        type: "gap",
        severity: "warning",
        message: `${placeActivities.length} activities may be too many for one day.`,
        dayIndex,
      });
    }

    // Meal coverage
    const hasMealTypes = new Set(
      placeActivities
        .filter((a) => a.mealType)
        .map((a) => a.mealType),
    );
    if (placeActivities.length >= 3 && !hasMealTypes.has("lunch")) {
      penalty += 5;
      issues.push({
        type: "gap",
        severity: "info",
        message: "No lunch planned — consider adding a meal.",
        dayIndex,
      });
    }

    const score = Math.max(0, Math.min(100, 100 - penalty));

    return { dayId: day.id, dayIndex, score, issues };
  });

  // Build pre-trip checklist from activity data
  const checklist: ChecklistItem[] = [];
  for (const [dayIndex, day] of itinerary.days.entries()) {
    for (const activity of day.activities) {
      if (activity.kind !== "place") continue;

      // Reservation required items
      if (
        activity.operatingWindow?.status === "outside" ||
        conflicts.some(
          (c) =>
            c.activityId === activity.id &&
            c.type === "reservation_recommended",
        )
      ) {
        checklist.push({
          id: `res-${activity.id}`,
          label: `Reserve ${activity.title}`,
          category: "reservation",
          dayIndex,
          activityTitle: activity.title,
        });
      }
    }
  }

  const totalIssues = days.reduce((sum, d) => sum + d.issues.length, 0);
  const overall =
    days.length > 0
      ? Math.round(days.reduce((sum, d) => sum + d.score, 0) / days.length)
      : 100;

  return { overall, days, checklist, totalIssues };
}

/**
 * Get health level from score.
 */
export function getHealthLevel(score: number): "good" | "fair" | "poor" {
  if (score >= 80) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

/**
 * Format itinerary for clipboard export.
 * Produces a spreadsheet-friendly text format.
 */
export function formatItineraryForExport(
  itinerary: Itinerary,
  tripStartDate?: string,
): string {
  const lines: string[] = [];

  for (const [dayIndex, day] of itinerary.days.entries()) {
    // Day header
    let header = `Day ${dayIndex + 1}`;
    if (tripStartDate) {
      const [year, month, dayNum] = tripStartDate.split("-").map(Number);
      if (year && month && dayNum) {
        const date = new Date(year, month - 1, dayNum);
        date.setDate(date.getDate() + dayIndex);
        const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
        const monthDay = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        header = `Day ${dayIndex + 1} — ${weekday}, ${monthDay}`;
      }
    }
    if (day.cityId) {
      header += ` — ${day.cityId}`;
    }
    lines.push(header);

    // Activities
    for (const activity of day.activities) {
      if (activity.kind !== "place") continue;

      const time = activity.schedule
        ? `${activity.schedule.arrivalTime}-${activity.schedule.departureTime}`
        : activity.timeOfDay;

      const parts = [time, activity.title, activity.tags?.[0] ?? ""].filter(
        Boolean,
      );
      lines.push(`  ${parts.join(" | ")}`);

      // Travel segment
      if (activity.travelToNext) {
        const seg = activity.travelToNext;
        const dur =
          seg.durationMinutes < 60
            ? `${seg.durationMinutes} min`
            : `${(seg.durationMinutes / 60).toFixed(1)}h`;
        lines.push(`    → ${dur} ${seg.mode}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

/** Escape a CSV field — wrap in double-quotes if it contains commas, quotes, or newlines. */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format an itinerary as CSV with BOM prefix for Excel compatibility.
 * Columns: Day, Date, Time, Place, Category, Duration, Neighborhood, Travel Mode, Travel Duration, Notes
 */
export function formatItineraryForCSV(
  itinerary: Itinerary,
  tripStartDate?: string,
): string {
  const BOM = "\uFEFF";
  const headers = [
    "Day",
    "Date",
    "Time",
    "Place",
    "Category",
    "Duration (min)",
    "Neighborhood",
    "Travel Mode",
    "Travel Duration (min)",
    "Notes",
  ];

  const rows: string[] = [headers.map(escapeCSV).join(",")];

  for (const [dayIndex, day] of itinerary.days.entries()) {
    let dateStr = "";
    if (tripStartDate) {
      const [year, month, dayNum] = tripStartDate.split("-").map(Number);
      if (year && month && dayNum) {
        const date = new Date(year, month - 1, dayNum);
        date.setDate(date.getDate() + dayIndex);
        dateStr = date.toISOString().split("T")[0] ?? "";
      }
    }

    for (const activity of day.activities) {
      if (activity.kind !== "place") continue;

      const time = activity.schedule
        ? `${activity.schedule.arrivalTime}-${activity.schedule.departureTime}`
        : activity.timeOfDay;

      const travelMode = activity.travelToNext?.mode ?? "";
      const travelDur = activity.travelToNext?.durationMinutes?.toString() ?? "";

      const row = [
        `Day ${dayIndex + 1}`,
        dateStr,
        time,
        activity.title,
        activity.tags?.[0] ?? "",
        activity.durationMin?.toString() ?? "",
        activity.neighborhood ?? "",
        travelMode,
        travelDur,
        activity.notes ?? "",
      ];

      rows.push(row.map(escapeCSV).join(","));
    }
  }

  return BOM + rows.join("\n");
}

// ---------------------------------------------------------------------------
// Accessibility Analysis
// ---------------------------------------------------------------------------

export type AccessibilityResult = {
  totalActivities: number;
  accessibleCount: number;
  unknownCount: number;
  inaccessibleCount: number;
  issues: HealthIssue[];
  checklist: ChecklistItem[];
};

/**
 * Analyze accessibility across an itinerary for travelers with mobility needs.
 * Returns issues for days with clusters of inaccessible locations and
 * checklist items for unconfirmed venues.
 */
export function analyzeAccessibility(
  itinerary: Itinerary,
  locationMap: Map<string, Location>,
): AccessibilityResult {
  let totalActivities = 0;
  let accessibleCount = 0;
  let unknownCount = 0;
  let inaccessibleCount = 0;
  const issues: HealthIssue[] = [];
  const checklist: ChecklistItem[] = [];

  for (const [dayIndex, day] of itinerary.days.entries()) {
    let consecutiveInaccessible = 0;

    for (const activity of day.activities) {
      if (activity.kind !== "place" || !activity.locationId) continue;
      totalActivities++;

      const loc = locationMap.get(activity.locationId);
      const a11y = loc?.accessibilityOptions;

      if (!a11y) {
        unknownCount++;
        checklist.push({
          id: `a11y-${activity.id}`,
          label: `Confirm accessibility at ${activity.title}`,
          category: "accessibility",
          dayIndex,
          activityTitle: activity.title,
        });
        // Unknown counts as potentially inaccessible for clustering
        consecutiveInaccessible++;
        continue;
      }

      if (a11y.wheelchairAccessibleEntrance) {
        accessibleCount++;
        consecutiveInaccessible = 0;
      } else {
        inaccessibleCount++;
        consecutiveInaccessible++;
      }

      // Flag cluster of 3+ consecutive inaccessible/unknown locations
      if (consecutiveInaccessible >= 3) {
        issues.push({
          type: "accessibility",
          severity: "warning",
          message: `${consecutiveInaccessible} consecutive activities without confirmed wheelchair access on Day ${dayIndex + 1}.`,
          dayIndex,
        });
        // Reset to avoid duplicate warnings for the same streak
        consecutiveInaccessible = 0;
      }
    }
  }

  return {
    totalActivities,
    accessibleCount,
    unknownCount,
    inaccessibleCount,
    issues,
    checklist,
  };
}
