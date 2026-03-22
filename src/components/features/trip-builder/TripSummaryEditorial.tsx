"use client";

import Image from "next/image";
import { useCallback, useMemo } from "react";
import { Calendar, Plane, Sparkles, MapPin } from "lucide-react";
import { formatTime12h } from "@/lib/utils/timeUtils";
import { parseLocalDate } from "@/lib/utils/dateUtils";

import { motion } from "framer-motion";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { getVibeById } from "@/data/vibes";
import { REGIONS, deriveRegionsFromCities } from "@/data/regions";
import { REGION_DESCRIPTIONS } from "@/data/regionDescriptions";
import { computeDefaultCityDays, redistributeOnRemove } from "@/lib/tripBuilder/cityDayAllocation";
import { SortableCityList } from "./SortableCityList";
import type { CityId, KnownCityId } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

type TripSummaryEditorialProps = {
  onEditDates?: () => void;
  onEditEntryPoint?: () => void;
  onEditVibes?: () => void;
  onEditRegions?: () => void;
  sanityConfig?: TripBuilderConfig;
};

export function TripSummaryEditorial({
  onEditDates,
  onEditEntryPoint,
  onEditVibes,
  onEditRegions,
  sanityConfig: _sanityConfig,
}: TripSummaryEditorialProps) {
  const { data, setData } = useTripBuilder();

  // Derive region names from cities (primary), fallback to data.regions for backward compat
  const derivedRegionNames = useMemo(() => {
    const cities = (data.cities ?? []) as KnownCityId[];
    if (cities.length > 0) {
      const regionIds = deriveRegionsFromCities(cities);
      return regionIds
        .map((id) => REGIONS.find((r) => r.id === id)?.name)
        .filter(Boolean) as string[];
    }
    // Fallback to data.regions for backward compat
    return (data.regions ?? [])
      .map((id) => REGIONS.find((r) => r.id === id)?.name)
      .filter(Boolean) as string[];
  }, [data.cities, data.regions]);

  // Dynamic headline
  const headline = useMemo(() => {
    const duration = data.duration;
    const regionStr =
      derivedRegionNames.length > 2
        ? `${derivedRegionNames.slice(0, 2).join(", ")} & more`
        : derivedRegionNames.join(" & ");

    if (duration && regionStr) return `${duration} days in ${regionStr}`;
    if (duration) return `${duration} days in Japan`;
    if (regionStr) return `Your trip to ${regionStr}`;
    return "Here\u2019s what you\u2019ve got so far";
  }, [derivedRegionNames, data.duration]);

  // Format dates
  const formattedDates = useMemo(() => {
    if (!data.dates.start || !data.dates.end) return null;
    const start = parseLocalDate(data.dates.start)!;
    const end = parseLocalDate(data.dates.end)!;
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const year = start.toLocaleDateString("en-US", { year: "numeric" });
    return `${start.toLocaleDateString("en-US", opts)} — ${end.toLocaleDateString("en-US", opts)}, ${year}`;
  }, [data.dates.start, data.dates.end]);

  const vibeNames = useMemo(
    () =>
      (data.vibes ?? [])
        .map((id) => getVibeById(id)?.name)
        .filter(Boolean) as string[],
    [data.vibes]
  );

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

  // Get images from derived regions for composite — always 3.
  // Uses gallery images from Sanity when available, falls back to hero images.
  const regionImages = useMemo(() => {
    const cities = (data.cities ?? []) as KnownCityId[];
    const regionIds = cities.length > 0
      ? deriveRegionsFromCities(cities)
      : (data.regions ?? []);

    const images: string[] = [];
    const usedSet = new Set<string>();

    // Collect hero + gallery images from selected regions
    for (const id of regionIds) {
      if (images.length >= 3) break;
      const desc = REGION_DESCRIPTIONS.find((r) => r.id === id);
      if (!desc) continue;

      if (!usedSet.has(desc.heroImage)) {
        images.push(desc.heroImage);
        usedSet.add(desc.heroImage);
      }
      for (const g of desc.galleryImages ?? []) {
        if (images.length >= 3) break;
        if (!usedSet.has(g)) {
          images.push(g);
          usedSet.add(g);
        }
      }
    }

    // Pad to 3 with hero images from other regions
    if (images.length < 3) {
      for (const desc of REGION_DESCRIPTIONS) {
        if (images.length >= 3) break;
        if (!usedSet.has(desc.heroImage)) {
          images.push(desc.heroImage);
          usedSet.add(desc.heroImage);
        }
      }
    }

    return images;
  }, [data.cities, data.regions]);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
      {/* Left — Trip details */}
      <div className="flex-1">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-brand-primary">
          STEP 05
        </p>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-3 font-serif text-2xl tracking-tight text-foreground sm:text-3xl"
        >
          {headline}
        </motion.h2>

        <div className="mt-8 flex flex-col gap-4">
          {/* Dates */}
          <SummaryItem
            icon={<Calendar className="h-4 w-4" />}
            label="Dates"
            value={
              formattedDates ? (
                <span>
                  {formattedDates}
                  {data.duration && (
                    <span className="ml-2 text-stone">
                      ({data.duration - 1} night{data.duration - 1 !== 1 ? "s" : ""})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-stone">Not set</span>
              )
            }
            onEdit={onEditDates}
          />

          {/* Flights */}
          <SummaryItem
            icon={<Plane className="h-4 w-4" />}
            label="Flights"
            value={
              data.entryPoint ? (
                <div className="flex flex-col gap-0.5">
                  <span>
                    <span className="text-stone">In:</span>{" "}
                    {data.entryPoint.name}
                    <span className="ml-2 rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-stone">
                      {data.entryPoint.iataCode}
                    </span>
                    {data.arrivalTime && (
                      <span className="ml-2 text-xs text-stone">
                        Landing {formatTime12h(data.arrivalTime)}
                      </span>
                    )}
                  </span>
                  <span>
                    <span className="text-stone">Out:</span>{" "}
                    {data.sameAsEntry !== false ? (
                      "Same airport"
                    ) : data.exitPoint ? (
                      <>
                        {data.exitPoint.name}
                        <span className="ml-2 rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-stone">
                          {data.exitPoint.iataCode}
                        </span>
                      </>
                    ) : (
                      "Same airport"
                    )}
                    {data.departureTime && (
                      <span className="ml-2 text-xs text-stone">
                        Departing {formatTime12h(data.departureTime)}
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <span className="text-stone">Not set</span>
              )
            }
            onEdit={onEditEntryPoint}
          />

          {/* Vibes */}
          <SummaryItem
            icon={<Sparkles className="h-4 w-4" />}
            label="Travel Style"
            value={
              vibeNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {vibeNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-sm font-medium text-brand-primary"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-stone">Not set</span>
              )
            }
            onEdit={onEditVibes}
          />

          {/* Destinations — reorderable inline */}
          <SummaryItem
            icon={<MapPin className="h-4 w-4" />}
            label="Route Order"
            value={
              (data.cities ?? []).length > 0 ? (
                <SortableCityList
                  cities={data.cities ?? []}
                  onReorder={handleCityReorder}
                  onRemove={handleCityRemove}
                  variant="a"
                  cityDays={effectiveCityDays}
                  onDaysChange={handleDaysChange}
                  totalDays={data.duration}
                  onDuplicate={handleDuplicateCity}
                />
              ) : (
                <span className="text-stone">Not set</span>
              )
            }
            onEdit={onEditRegions}
          />
        </div>
      </div>

      {/* Right — Composite image grid of selected regions */}
      {regionImages.length > 0 && (
        <div className="hidden w-80 shrink-0 lg:block">
          <div className="grid grid-cols-2 gap-2">
            {regionImages.map((img, i) => (
              <div
                key={img}
                className={`relative overflow-hidden rounded-xl ${
                  i === 0 ? "col-span-2 aspect-[16/10]" : "aspect-square"
                }`}
              >
                <Image
                  src={img}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type SummaryItemProps = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  onEdit?: () => void;
};

function SummaryItem({ icon, label, value, onEdit }: SummaryItemProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface text-stone">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-stone">
            {label}
          </p>
          <div className="mt-1 text-sm text-foreground">{value}</div>
        </div>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="link-reveal shrink-0 min-h-[44px] flex items-center px-2 text-xs text-stone hover:text-foreground-secondary"
        >
          Edit
        </button>
      )}
    </div>
  );
}
