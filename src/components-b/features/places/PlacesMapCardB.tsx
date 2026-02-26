"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, forwardRef } from "react";
import { resizePhotoUrl } from "@/lib/google/transformations";
import type { Location } from "@/types/location";

type PlacesMapCardBProps = {
  location: Location;
  isHighlighted?: boolean;
  onHover?: (locationId: string | null) => void;
  onSelect?: (location: Location) => void;
};

export const PlacesMapCardB = memo(
  forwardRef<HTMLDivElement, PlacesMapCardBProps>(function PlacesMapCardB(
    { location, isHighlighted, onHover, onSelect },
    ref,
  ) {
    const thumb = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 96);

    return (
      <div
        ref={ref}
        data-location-id={location.id}
        onMouseEnter={() => onHover?.(location.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        <Link
          href={`/b/places/${location.id}`}
          onClick={onSelect ? (e) => { e.preventDefault(); onSelect(location); } : undefined}
          className={`flex items-center gap-2 rounded-xl bg-white pl-2 pr-3 py-1.5 transition ${
            isHighlighted
              ? "ring-1 ring-[var(--primary)]/40 bg-white"
              : "hover:bg-white"
          }`}
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          {thumb && (
            <div className="relative h-8 w-8 shrink-0 rounded-lg overflow-hidden">
              <Image
                src={thumb}
                alt={location.name}
                fill
                className="object-cover"
                sizes="32px"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--foreground)] truncate leading-tight">
              {location.name}
            </p>
            <div className="flex items-center gap-1">
              <p className="text-[11px] text-[var(--muted-foreground)] truncate leading-tight">
                {location.city}
              </p>
              {location.rating ? (
                <>
                  <span className="text-[var(--border)]">&middot;</span>
                  <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-[var(--muted-foreground)]">
                    <svg className="h-2.5 w-2.5 text-[var(--warning)]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
                    </svg>
                    {location.rating.toFixed(1)}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </Link>
      </div>
    );
  }),
);
