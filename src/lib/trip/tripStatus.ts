import type { StoredTrip } from "@/services/trip/types";

export type TripLifecycleStatus = "planning" | "upcoming" | "active" | "completed";

/**
 * Derive trip lifecycle status from builder dates at render time.
 * Uses local-date constructor to avoid UTC midnight timezone bugs.
 */
export function getTripStatus(trip: StoredTrip): TripLifecycleStatus {
  const dates = trip.builderData?.dates;
  if (!dates?.start || !dates?.end) return "planning";

  const [sy = 0, sm = 1, sd = 1] = dates.start.split("-").map(Number);
  const [ey = 0, em = 1, ed = 1] = dates.end.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (today > end) return "completed";
  if (today >= start && today <= end) return "active";
  return "upcoming";
}

export type TripGroup = {
  active: StoredTrip[];
  upcoming: StoredTrip[];
  past: StoredTrip[];
  planning: StoredTrip[];
};

/**
 * Group trips by lifecycle status and sort within each group.
 */
export function groupTrips(trips: StoredTrip[]): TripGroup {
  const groups: TripGroup = { active: [], upcoming: [], past: [], planning: [] };

  for (const trip of trips) {
    if ((trip.itinerary?.days?.length ?? 0) === 0) continue;
    const status = getTripStatus(trip);
    switch (status) {
      case "active":
        groups.active.push(trip);
        break;
      case "upcoming":
        groups.upcoming.push(trip);
        break;
      case "completed":
        groups.past.push(trip);
        break;
      case "planning":
        groups.planning.push(trip);
        break;
    }
  }

  // Sort upcoming by start date ASC
  groups.upcoming.sort((a, b) => {
    const aStart = a.builderData?.dates?.start ?? "";
    const bStart = b.builderData?.dates?.start ?? "";
    return aStart.localeCompare(bStart);
  });

  // Sort past by end date DESC
  groups.past.sort((a, b) => {
    const aEnd = a.builderData?.dates?.end ?? "";
    const bEnd = b.builderData?.dates?.end ?? "";
    return bEnd.localeCompare(aEnd);
  });

  // Sort planning by updatedAt DESC
  groups.planning.sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return groups;
}

const STATUS_CONFIG: Record<TripLifecycleStatus, { label: string; colorClass: string; bgClass: string }> = {
  active: { label: "Active", colorClass: "text-success", bgClass: "bg-sage/15" },
  upcoming: { label: "Upcoming", colorClass: "text-brand-primary", bgClass: "bg-brand-primary/15" },
  completed: { label: "Completed", colorClass: "text-stone", bgClass: "bg-stone/15" },
  planning: { label: "Planning", colorClass: "text-brand-secondary", bgClass: "bg-brand-secondary/15" },
};

export function getStatusConfig(status: TripLifecycleStatus) {
  return STATUS_CONFIG[status];
}
