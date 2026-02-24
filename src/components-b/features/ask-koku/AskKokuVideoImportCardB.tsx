"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star, MapPin, ExternalLink } from "lucide-react";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { useAppState } from "@/state/AppState";
import { PlatformIcon } from "@/components/features/video-import/PlatformIcon";
import type { VideoImportData } from "@/components/features/ask-koku/AskKokuVideoImportCard";

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type AskKokuVideoImportCardProps = {
  data: VideoImportData;
};

export function AskKokuVideoImportCardB({ data }: AskKokuVideoImportCardProps) {
  const { saved, toggleSave } = useAppState();

  if (data.error || !data.location) {
    return null;
  }

  const loc = data.location;
  const isSavedPlace = saved.includes(loc.id);
  const imageSrc = resizePhotoUrl(loc.primaryPhotoUrl ?? loc.image, 200) || FALLBACK_IMAGE;
  const platform = data.videoMetadata?.platform;

  return (
    <div className="mt-2 rounded-xl bg-[var(--accent)] p-4">
      <div className="mb-3 flex items-center gap-2">
        {platform && <PlatformIcon platform={platform} className="h-4 w-4" />}
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--primary)]">
          {data.isNewLocation ? "New Discovery" : "Found in Koku"}
        </p>
      </div>

      <Link
        href={`/b/places?location=${loc.id}`}
        className="group flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
          <Image
            src={imageSrc}
            alt={loc.name}
            fill
            className="object-cover"
            sizes="56px"
            unoptimized
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
            {loc.name}
          </p>
          {data.extraction?.locationNameJapanese && (
            <p className="truncate text-xs text-[var(--muted-foreground)]">
              {data.extraction.locationNameJapanese}
            </p>
          )}
          <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <span className="capitalize">{loc.category}</span>
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {loc.city}
            </span>
            {loc.rating && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-[var(--warning)] text-[var(--warning)]" />
                {Number(loc.rating).toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
      </Link>

      {loc.shortDescription && (
        <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
          {loc.shortDescription}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleSave(loc.id)}
          className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-transform active:scale-[0.98] ${
            isSavedPlace
              ? "bg-[var(--primary)] text-white"
              : "border border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
          }`}
        >
          <Heart className={`h-4 w-4 ${isSavedPlace ? "fill-current" : ""}`} />
          {isSavedPlace ? "Saved" : "Save"}
        </button>
      </div>

      {data.extraction?.confidence && (
        <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
          {data.extraction.confidence} confidence
        </p>
      )}
    </div>
  );
}
