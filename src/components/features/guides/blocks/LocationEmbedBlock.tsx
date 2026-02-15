"use client";

import Link from "next/link";

type LocationEmbedProps = {
  value: {
    locationId: string;
    label?: string;
  };
};

export function LocationEmbedBlock({ value }: LocationEmbedProps) {
  return (
    <div className="mx-auto my-8 max-w-2xl px-6">
      <Link
        href={`/explore?location=${value.locationId}`}
        className="group flex items-center gap-3 rounded-xl border border-border/50 bg-surface p-4 transition-all hover:border-brand-primary/30 hover:shadow-lg"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10">
          <svg
            className="h-5 w-5 text-brand-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground group-hover:text-brand-primary transition-colors">
            {value.label || "View Location"}
          </p>
          <p className="text-xs text-stone truncate">{value.locationId}</p>
        </div>
        <svg
          className="ml-auto h-4 w-4 shrink-0 text-stone group-hover:text-brand-primary transition-colors"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
