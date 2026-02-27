"use client";

import { Hotel, MapPin } from "lucide-react";
import type { EntryPoint } from "@/types/trip";

type AccommodationBookendBProps = {
  location: EntryPoint;
  variant: "start" | "end";
};

export function AccommodationBookendB({
  location,
  variant,
}: AccommodationBookendBProps) {
  const label = variant === "start" ? "Starting point" : "Returning to";

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        {variant === "start" ? (
          <Hotel
            className="h-4 w-4"
            style={{ color: "var(--primary)" }}
          />
        ) : (
          <MapPin
            className="h-4 w-4"
            style={{ color: "var(--primary)" }}
          />
        )}
      </div>
      <div className="min-w-0">
        <p
          className="truncate text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          {location.name}
        </p>
        <p
          className="text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
