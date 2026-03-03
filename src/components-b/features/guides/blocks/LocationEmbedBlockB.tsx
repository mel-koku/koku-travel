"use client";

import Link from "next/link";

type LocationEmbedBProps = {
  value: {
    locationId: string;
    label?: string;
  };
};

export function LocationEmbedBlockB({ value }: LocationEmbedBProps) {
  return (
    <div className="mx-auto my-8 max-w-2xl px-6">
      <Link
        href={`/b/places?location=${value.locationId}`}
        className="group flex items-center gap-3 rounded-2xl bg-white p-4 transition-all hover:shadow-[var(--shadow-elevated)]"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
            style={{ color: "var(--primary)" }}
          >
            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p
            className="text-sm font-medium transition-colors group-hover:text-[var(--primary)]"
            style={{ color: "var(--foreground)" }}
          >
            {value.label || "View Location"}
          </p>
          <p className="truncate text-xs" style={{ color: "var(--muted-foreground)" }}>
            {value.locationId}
          </p>
        </div>
        <svg
          className="ml-auto h-4 w-4 shrink-0 transition-colors group-hover:text-[var(--primary)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
          style={{ color: "var(--muted-foreground)" }}
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
