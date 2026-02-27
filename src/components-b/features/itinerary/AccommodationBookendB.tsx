"use client";

import { Hotel, Pencil } from "lucide-react";
import type { EntryPoint } from "@/types/trip";

type AccommodationBookendBProps = {
  location: EntryPoint;
  variant: "start" | "end";
  /** Travel estimate in minutes to/from nearest activity */
  travelMinutes?: number;
  /** Walking distance in meters */
  distanceMeters?: number;
  /** Called when user clicks to edit accommodation */
  onEdit?: () => void;
};

export function AccommodationBookendB({
  location,
  variant,
  travelMinutes,
  distanceMeters,
  onEdit,
}: AccommodationBookendBProps) {
  const label =
    variant === "start"
      ? `Start from ${location.name}`
      : `Return to ${location.name}`;

  const travelLabel = formatTravelLabel(travelMinutes, distanceMeters);
  const isClickable = Boolean(onEdit);

  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={!isClickable}
      className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-left transition-colors ${
        isClickable ? "cursor-pointer hover:border-[var(--primary)]" : "cursor-default"
      }`}
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <Hotel
          className="h-3.5 w-3.5"
          style={{ color: "var(--primary)" }}
        />
      </div>
      <div className="min-w-0">
        <p
          className="truncate text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          {label}
        </p>
        {travelLabel && (
          <p
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {travelLabel}
          </p>
        )}
      </div>
      {isClickable && (
        <Pencil
          className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: "var(--muted-foreground)" }}
        />
      )}
    </button>
  );
}

function formatTravelLabel(
  minutes?: number,
  meters?: number,
): string | null {
  if (!minutes || minutes < 1) return null;

  const time =
    minutes >= 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}min`
      : `${minutes} min`;

  const mode =
    meters != null && meters <= 2000
      ? "walk"
      : "transit";

  return `~${time} ${mode}`;
}
