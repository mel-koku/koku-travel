"use client";

import { useMemo } from "react";
import { Calendar, MapPin, Plane, Compass } from "lucide-react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { VIBES, type VibeId } from "@/data/vibes";
import { REGIONS } from "@/data/regions";

type TripSummaryBProps = {
  onEditDates?: () => void;
  onEditEntryPoint?: () => void;
  onEditVibes?: () => void;
  onEditRegions?: () => void;
};

export function TripSummaryB({
  onEditDates,
  onEditEntryPoint,
  onEditVibes,
  onEditRegions,
}: TripSummaryBProps) {
  const { data } = useTripBuilder();

  const dateDisplay = useMemo(() => {
    if (!data.dates.start || !data.dates.end) return "Not set";
    const start = new Date(
      ...data.dates.start.split("-").map(Number) as [number, number, number],
    );
    start.setMonth(start.getMonth() - 1); // Adjust for 0-indexed month
    const end = new Date(
      ...data.dates.end.split("-").map(Number) as [number, number, number],
    );
    end.setMonth(end.getMonth() - 1);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(start)} \u2013 ${fmt(end)}${data.duration ? ` (${data.duration} days)` : ""}`;
  }, [data.dates.start, data.dates.end, data.duration]);

  const vibeDisplay = useMemo(() => {
    if (!data.vibes?.length) return "Not set";
    return data.vibes
      .map((id: VibeId) => VIBES.find((v) => v.id === id)?.name ?? id)
      .join(", ");
  }, [data.vibes]);

  const cityDisplay = useMemo(() => {
    if (!data.cities?.length) return "Not set";
    const knownCityMap = new Map<string, string>();
    for (const r of REGIONS) {
      for (const c of r.cities) {
        knownCityMap.set(c.id, c.name);
      }
    }
    return data.cities
      .map(
        (id) =>
          knownCityMap.get(id) ?? id.charAt(0).toUpperCase() + id.slice(1),
      )
      .join(", ");
  }, [data.cities]);

  const items = [
    {
      icon: Calendar,
      label: "Dates",
      value: dateDisplay,
      onEdit: onEditDates,
    },
    {
      icon: Plane,
      label: "Entry Point",
      value: data.entryPoint?.name ?? "Not set",
      onEdit: onEditEntryPoint,
    },
    {
      icon: Compass,
      label: "Vibes",
      value: vibeDisplay,
      onEdit: onEditVibes,
    },
    {
      icon: MapPin,
      label: "Cities",
      value: cityDisplay,
      onEdit: onEditRegions,
    },
  ];

  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--primary)]">
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--muted-foreground)]">
                  {item.label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
                  {item.value}
                </p>
              </div>
            </div>
            {item.onEdit && (
              <button
                type="button"
                onClick={item.onEdit}
                className="shrink-0 rounded-lg px-3 py-1 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
              >
                Edit
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
