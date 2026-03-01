"use client";

import { useCallback, useMemo } from "react";
import { Calendar, MapPin, Plane, Compass } from "lucide-react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { VIBES, type VibeId } from "@/data/vibes";
import { deriveRegionsFromCities } from "@/data/regions";
import { optimizeCitySequence } from "@/lib/routing/citySequence";
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

  // Effective per-city day allocation
  const effectiveCityDays = useMemo(() => {
    const cities = data.cities ?? [];
    const duration = data.duration;
    if (cities.length < 2 || !duration || duration <= 0) return undefined;
    return data.cityDays ?? computeDefaultCityDays(cities, duration);
  }, [data.cities, data.duration, data.cityDays]);

  // Day change handler — adjusts target city and adjacent city to keep total constant
  const handleDaysChange = useCallback(
    (cityId: CityId, newDays: number) => {
      setData((prev) => {
        const cities = prev.cities ?? [];
        const duration = prev.duration;
        if (!duration || cities.length < 2) return prev;

        const current = prev.cityDays ?? computeDefaultCityDays(cities, duration);
        const oldDays = current[cityId] ?? 1;
        const delta = newDays - oldDays;
        if (delta === 0) return prev;

        // Find adjacent city to absorb the delta
        const idx = cities.indexOf(cityId);
        const adjacentIdx = idx < cities.length - 1 ? idx + 1 : idx - 1;
        const adjacentCity = cities[adjacentIdx];
        if (!adjacentCity) return prev;

        const adjacentOld = current[adjacentCity] ?? 1;
        const adjacentNew = adjacentOld - delta;
        if (adjacentNew < 1 || newDays < 1) return prev;

        return {
          ...prev,
          cityDays: { ...current, [cityId]: newDays, [adjacentCity]: adjacentNew },
        };
      });
    },
    [setData],
  );

  const handleCityReorder = useCallback(
    (newOrder: CityId[]) => {
      setData((prev) => ({
        ...prev,
        cities: newOrder,
        regions: deriveRegionsFromCities(newOrder),
        customCityOrder: true,
      }));
    },
    [setData],
  );

  const handleCityRemove = useCallback(
    (cityId: CityId) => {
      setData((prev) => {
        const current = new Set<CityId>(prev.cities ?? []);
        current.delete(cityId);
        const raw = Array.from(current);
        const cities = raw.length >= 2
          ? optimizeCitySequence(prev.entryPoint, raw, prev.sameAsEntry !== false ? prev.entryPoint : prev.exitPoint)
          : raw;

        // Redistribute freed days to remaining cities
        let cityDays: Record<CityId, number> | undefined;
        if (prev.cityDays && cities.length >= 2) {
          cityDays = redistributeOnRemove(prev.cityDays, cityId, cities);
        }

        return { ...prev, cities, regions: deriveRegionsFromCities(cities), customCityOrder: false, cityDays };
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
        ? `In: ${data.entryPoint.name} [${data.entryPoint.iataCode}] · Out: ${
            data.sameAsEntry !== false
              ? "Same airport"
              : data.exitPoint
                ? `${data.exitPoint.name} [${data.exitPoint.iataCode}]`
                : "Same airport"
          }`
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
