"use client";

import Link from "next/link";

type LocationEmbedCProps = {
  value: {
    locationId: string;
    label?: string;
  };
};

export function LocationEmbedBlockC({ value }: LocationEmbedCProps) {
  return (
    <div className="my-8">
      <Link
        href={`/c/places?location=${value.locationId}`}
        className="group flex items-center gap-3 border border-[var(--border)] bg-[var(--background)] p-4 transition-colors hover:bg-[var(--surface)]"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--border)]"
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
          <p className="text-sm font-bold text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]">
            {value.label || "View Location"}
          </p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">
            {value.locationId}
          </p>
        </div>
        <svg
          className="ml-auto h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]"
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
