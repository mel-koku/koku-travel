"use client";

import Image from "next/image";
import { useMemo } from "react";
import { Calendar, Plane, Sparkles, MapPin } from "lucide-react";

import { motion } from "framer-motion";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { getVibeById } from "@/data/vibes";
import { REGIONS } from "@/data/regions";
import { REGION_DESCRIPTIONS } from "@/data/regionDescriptions";
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
  const { data } = useTripBuilder();

  // Dynamic headline
  const headline = useMemo(() => {
    const regionNames = (data.regions ?? [])
      .map((id) => REGIONS.find((r) => r.id === id)?.name)
      .filter(Boolean);

    const duration = data.duration;
    const regionStr =
      regionNames.length > 2
        ? `${regionNames.slice(0, 2).join(", ")} & more`
        : regionNames.join(" & ");

    if (duration && regionStr) return `${duration} days in ${regionStr}`;
    if (duration) return `${duration} days in Japan`;
    if (regionStr) return `Your trip to ${regionStr}`;
    return "Your journey, at a glance";
  }, [data.regions, data.duration]);

  // Format dates
  const formattedDates = useMemo(() => {
    if (!data.dates.start || !data.dates.end) return null;
    const start = new Date(data.dates.start);
    const end = new Date(data.dates.end);
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

  const regionNames = useMemo(
    () =>
      (data.regions ?? [])
        .map((id) => REGIONS.find((r) => r.id === id)?.name)
        .filter(Boolean) as string[],
    [data.regions]
  );

  // Get hero images from selected regions for composite
  const regionImages = useMemo(() => {
    return (data.regions ?? [])
      .slice(0, 3)
      .map((id) => {
        const desc = REGION_DESCRIPTIONS.find((r) => r.id === id);
        return desc?.heroImage;
      })
      .filter(Boolean) as string[];
  }, [data.regions]);

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
          className="mt-3 font-serif text-3xl italic tracking-tight text-foreground sm:text-4xl"
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
                <span className="text-stone">None yet</span>
              )
            }
            onEdit={onEditDates}
          />

          {/* Entry point */}
          <SummaryItem
            icon={<Plane className="h-4 w-4" />}
            label="Arriving at"
            value={
              data.entryPoint ? (
                <span>
                  {data.entryPoint.name}
                  <span className="ml-2 rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-stone">
                    {data.entryPoint.iataCode}
                  </span>
                </span>
              ) : (
                <span className="text-stone">None yet</span>
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
                <span className="text-stone">None yet</span>
              )
            }
            onEdit={onEditVibes}
          />

          {/* Regions */}
          <SummaryItem
            icon={<MapPin className="h-4 w-4" />}
            label="Destinations"
            value={
              regionNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {regionNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-sage/10 px-2.5 py-0.5 text-sm font-medium text-sage"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-stone">None yet</span>
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
    <div className="flex items-start justify-between gap-4">
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
          className="link-reveal shrink-0 text-xs text-stone hover:text-foreground-secondary"
        >
          Edit
        </button>
      )}
    </div>
  );
}
