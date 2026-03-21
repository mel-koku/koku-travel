"use client";

import { Hotel, MapPin } from "lucide-react";
import type { EntryPoint } from "@/types/trip";

type AccommodationBookendCProps = {
  location: EntryPoint;
  variant: "start" | "end";
};

export function AccommodationBookendC({
  location,
  variant,
}: AccommodationBookendCProps) {
  const label = variant === "start" ? "Starting point" : "Returning to";

  return (
    <div
      className="flex items-center gap-3 border px-4 py-3"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--card)",
      }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center border"
        style={{
          borderColor: "var(--primary)",
          backgroundColor: "color-mix(in srgb, var(--primary) 5%, transparent)",
        }}
      >
        {variant === "start" ? (
          <Hotel className="h-4 w-4" style={{ color: "var(--primary)" }} />
        ) : (
          <MapPin className="h-4 w-4" style={{ color: "var(--primary)" }} />
        )}
      </div>
      <div className="min-w-0">
        <p
          className="truncate text-sm font-bold"
          style={{ color: "var(--foreground)" }}
        >
          {location.name}
        </p>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ color: "var(--muted-foreground)" }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
