"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star, MapPin, ExternalLink } from "lucide-react";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { useAppState } from "@/state/AppState";
import { PlatformIcon } from "@/components/features/video-import/PlatformIcon";

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export type VideoImportData = {
  type: "videoImport";
  error?: string;
  location?: {
    id: string;
    name: string;
    city: string;
    region: string;
    category: string;
    image: string;
    primaryPhotoUrl?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    shortDescription?: string | null;
    source?: string | null;
  };
  isNewLocation?: boolean;
  extraction?: {
    locationName: string;
    locationNameJapanese?: string;
    city: string;
    category: string;
    confidence: string;
  };
  videoMetadata?: {
    platform: string;
    title: string;
    authorName: string;
    thumbnailUrl?: string | null;
  };
};

type AskKokuVideoImportCardProps = {
  data: VideoImportData;
};

export function AskKokuVideoImportCard({ data }: AskKokuVideoImportCardProps) {
  const { favorites, toggleFavorite } = useAppState();

  if (data.error || !data.location) {
    return null; // Error messages are rendered by the text content
  }

  const loc = data.location;
  const isFavorited = favorites.includes(loc.id);
  const imageSrc = resizePhotoUrl(loc.primaryPhotoUrl ?? loc.image, 200) || FALLBACK_IMAGE;
  const platform = data.videoMetadata?.platform;

  return (
    <div className="mt-2 rounded-xl border border-sage/30 bg-sage/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        {platform && <PlatformIcon platform={platform} className="h-4 w-4" />}
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-sage">
          {data.isNewLocation ? "New Discovery" : "Found in Koku"}
        </p>
      </div>

      <Link
        href={`/explore?location=${loc.id}`}
        className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 transition-colors hover:border-brand-primary/30"
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
          <p className="truncate text-sm font-medium text-foreground group-hover:text-brand-primary">
            {loc.name}
          </p>
          {data.extraction?.locationNameJapanese && (
            <p className="truncate text-xs text-foreground-secondary">
              {data.extraction.locationNameJapanese}
            </p>
          )}
          <div className="mt-0.5 flex items-center gap-2 text-xs text-foreground-secondary">
            <span className="capitalize">{loc.category}</span>
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {loc.city}
            </span>
            {loc.rating && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-brand-secondary text-brand-secondary" />
                {Number(loc.rating).toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-stone" />
      </Link>

      {loc.shortDescription && (
        <p className="mt-2 text-xs leading-relaxed text-foreground-secondary">
          {loc.shortDescription}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleFavorite(loc.id)}
          className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-transform active:scale-[0.98] ${
            isFavorited
              ? "border border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
              : "bg-brand-primary text-white"
          }`}
        >
          <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
          {isFavorited ? "Saved" : "Save to Favorites"}
        </button>
      </div>

      {data.extraction?.confidence && (
        <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wide text-stone">
          {data.extraction.confidence} confidence
        </p>
      )}
    </div>
  );
}
