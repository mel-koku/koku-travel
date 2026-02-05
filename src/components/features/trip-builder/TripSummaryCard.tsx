"use client";

import { useMemo } from "react";
import {
  Calendar,
  Plane,
  Sparkles,
  MapPin,
  Pencil,
} from "lucide-react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { getVibeById } from "@/data/vibes";
import { REGIONS } from "@/data/regions";
import { cn } from "@/lib/cn";

export type TripSummaryCardProps = {
  onEditDates?: () => void;
  onEditEntryPoint?: () => void;
  onEditVibes?: () => void;
  onEditRegions?: () => void;
  className?: string;
};

/**
 * Visual trip overview card showing selected dates, entry point, vibes, and regions.
 */
export function TripSummaryCard({
  onEditDates,
  onEditEntryPoint,
  onEditVibes,
  onEditRegions,
  className,
}: TripSummaryCardProps) {
  const { data } = useTripBuilder();

  // Format dates for display
  const formattedDates = useMemo(() => {
    if (!data.dates.start || !data.dates.end) {
      return null;
    }

    const start = new Date(data.dates.start);
    const end = new Date(data.dates.end);

    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    const yearOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
    };

    const startStr = start.toLocaleDateString("en-US", options);
    const endStr = end.toLocaleDateString("en-US", options);
    const year = start.toLocaleDateString("en-US", yearOptions);

    return `${startStr} - ${endStr}, ${year}`;
  }, [data.dates.start, data.dates.end]);

  // Get duration in nights
  const nights = useMemo(() => {
    if (!data.duration) return null;
    return data.duration - 1;
  }, [data.duration]);

  // Get vibe names
  const vibeNames = useMemo(() => {
    if (!data.vibes?.length) return [];
    return data.vibes
      .map((id) => getVibeById(id)?.name)
      .filter(Boolean) as string[];
  }, [data.vibes]);

  // Get region names
  const regionNames = useMemo(() => {
    if (!data.regions?.length) return [];
    return data.regions
      .map((id) => REGIONS.find((r) => r.id === id)?.name)
      .filter(Boolean) as string[];
  }, [data.regions]);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-primary/5 to-sage/5 px-5 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-charcoal">Trip Summary</h3>
        <p className="text-sm text-stone">Review your selections</p>
      </div>

      {/* Summary Items */}
      <div className="divide-y divide-border">
        {/* Dates */}
        <SummaryRow
          icon={<Calendar className="h-4 w-4" />}
          label="Dates"
          value={
            formattedDates ? (
              <span>
                {formattedDates}
                {nights !== null && (
                  <span className="ml-2 text-stone">
                    ({nights} night{nights !== 1 ? "s" : ""})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-stone">Not set</span>
            )
          }
          onEdit={onEditDates}
        />

        {/* Entry Point */}
        <SummaryRow
          icon={<Plane className="h-4 w-4" />}
          label="Arriving at"
          value={
            data.entryPoint ? (
              <span>
                {data.entryPoint.name}
                {data.entryPoint.iataCode && (
                  <span className="ml-2 rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-stone">
                    {data.entryPoint.iataCode}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-stone">Not selected</span>
            )
          }
          onEdit={onEditEntryPoint}
        />

        {/* Vibes */}
        <SummaryRow
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
              <span className="text-stone">Not selected</span>
            )
          }
          onEdit={onEditVibes}
        />

        {/* Regions */}
        <SummaryRow
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
              <span className="text-stone">Not selected</span>
            )
          }
          onEdit={onEditRegions}
        />
      </div>
    </div>
  );
}

type SummaryRowProps = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  onEdit?: () => void;
};

function SummaryRow({ icon, label, value, onEdit }: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface text-stone">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-stone">
            {label}
          </p>
          <div className="mt-1 text-sm text-charcoal">{value}</div>
        </div>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-stone hover:bg-sand hover:text-warm-gray"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      )}
    </div>
  );
}
