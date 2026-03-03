"use client";

import { useCallback, useMemo } from "react";
import { Calendar, MapPin, Plane, Compass } from "lucide-react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { VIBES, type VibeId } from "@/data/vibes";
import { formatTime12h } from "@/lib/utils/timeUtils";
import { deriveRegionsFromCities } from "@/data/regions";
import { computeDefaultCityDays, redistributeOnRemove } from "@/lib/tripBuilder/cityDayAllocation";
import { SortableCityList } from "@/components/features/trip-builder/SortableCityList";
import type { CityId } from "@/types/trip";

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
  const { data, setData } = useTripBuilder();

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

  // Effective per-city day allocation (parallel array)
  const effectiveCityDays = useMemo(() => {
    const cities = data.cities ?? [];
    const duration = data.duration;
    if (cities.length < 2 || !duration || duration <= 0) return undefined;
    return data.cityDays ?? computeDefaultCityDays(cities, duration);
  }, [data.cities, data.duration, data.cityDays]);

  // Day change handler — adjusts target entry and adjacent entry to keep total constant
  const handleDaysChange = useCallback(
    (index: number, newDays: number) => {
      setData((prev) => {
        const cities = prev.cities ?? [];
        const duration = prev.duration;
        if (!duration || cities.length < 2) return prev;

        const current = prev.cityDays ?? computeDefaultCityDays(cities, duration);
        const oldDays = current[index] ?? 1;
        const delta = newDays - oldDays;
        if (delta === 0) return prev;

        // Find adjacent entry to absorb the delta
        const adjacentIdx = index < cities.length - 1 ? index + 1 : index - 1;
        const adjacentOld = current[adjacentIdx] ?? 1;
        const adjacentNew = adjacentOld - delta;
        if (adjacentNew < 1 || newDays < 1) return prev;

        const next = [...current];
        next[index] = newDays;
        next[adjacentIdx] = adjacentNew;
        return { ...prev, cityDays: next };
      });
    },
    [setData],
  );

  // City reorder handler (manual drag) — moves both cities and cityDays together
  const handleCityReorder = useCallback(
    (newCities: CityId[], newCityDays?: number[]) => {
      setData((prev) => ({
        ...prev,
        cities: newCities,
        cityDays: newCityDays ?? prev.cityDays,
        regions: deriveRegionsFromCities(newCities),
        customCityOrder: true,
      }));
    },
    [setData],
  );

  // City remove handler (by index, redistributes days)
  const handleCityRemove = useCallback(
    (index: number) => {
      setData((prev) => {
        const oldCities = prev.cities ?? [];
        if (index < 0 || index >= oldCities.length) return prev;

        const cities = [...oldCities];
        cities.splice(index, 1);

        // Redistribute freed days to remaining entries
        let cityDays: number[] | undefined;
        if (prev.cityDays && cities.length >= 2) {
          cityDays = redistributeOnRemove(prev.cityDays, index);
        } else {
          cityDays = undefined;
        }

        // Check if duplicates exist — if so, keep customCityOrder
        const uniqueCities = new Set(cities);
        const hasDuplicates = uniqueCities.size < cities.length;

        return {
          ...prev,
          cities,
          regions: deriveRegionsFromCities(cities),
          customCityOrder: hasDuplicates || undefined,
          cityDays,
        };
      });
    },
    [setData],
  );

  // Duplicate a city — inserts a copy at index+1, steals 1 day from source
  const handleDuplicateCity = useCallback(
    (index: number) => {
      setData((prev) => {
        const oldCities = prev.cities ?? [];
        const duration = prev.duration;
        if (index < 0 || index >= oldCities.length || !duration) return prev;

        const current = prev.cityDays ?? computeDefaultCityDays(oldCities, duration);
        const sourceDays = current[index] ?? 1;
        if (sourceDays < 2) return prev; // Can't duplicate with only 1 day

        const cities = [...oldCities];
        cities.splice(index + 1, 0, oldCities[index]!);

        const cityDays = [...current];
        cityDays[index] = sourceDays - 1;
        cityDays.splice(index + 1, 0, 1);

        return {
          ...prev,
          cities,
          cityDays,
          regions: deriveRegionsFromCities(cities),
          customCityOrder: true,
        };
      });
    },
    [setData],
  );

  const hasCities = (data.cities ?? []).length > 0;

  const items = [
    {
      icon: Calendar,
      label: "Dates",
      value: dateDisplay,
      onEdit: onEditDates,
    },
    {
      icon: Plane,
      label: "Flights",
      value: data.entryPoint
        ? `In: ${data.entryPoint.name} [${data.entryPoint.iataCode}]${data.arrivalTime ? ` · Landing ${formatTime12h(data.arrivalTime)}` : ""} · Out: ${
            data.sameAsEntry !== false
              ? "Same airport"
              : data.exitPoint
                ? `${data.exitPoint.name} [${data.exitPoint.iataCode}]`
                : "Same airport"
          }${data.departureTime ? ` · Departing ${formatTime12h(data.departureTime)}` : ""}`
        : "Not set",
      onEdit: onEditEntryPoint,
    },
    {
      icon: Compass,
      label: "Vibes",
      value: vibeDisplay,
      onEdit: onEditVibes,
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

        {/* Route Order — reorderable inline */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-1 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--primary)]">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                Route Order
              </p>
              {hasCities ? (
                <SortableCityList
                  cities={data.cities ?? []}
                  onReorder={handleCityReorder}
                  onRemove={handleCityRemove}
                  variant="b"
                  cityDays={effectiveCityDays}
                  onDaysChange={handleDaysChange}
                  totalDays={data.duration}
                  onDuplicate={handleDuplicateCity}
                />
              ) : (
                <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
                  Not set
                </p>
              )}
            </div>
          </div>
          {onEditRegions && (
            <button
              type="button"
              onClick={onEditRegions}
              className="shrink-0 rounded-lg px-3 py-1 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
