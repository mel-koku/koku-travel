"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star, MapPin, ExternalLink } from "lucide-react";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { useAppState } from "@/state/AppState";
import { PlatformIcon } from "./PlatformIcon";

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type VideoImportResultProps = {
  location: {
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
  isNewLocation: boolean;
  platform: string;
  confidence: string;
  locationNameJapanese?: string;
};

export function VideoImportResult({
  location,
  isNewLocation,
  platform,
  confidence,
  locationNameJapanese,
}: VideoImportResultProps) {
  const { saved, toggleSave } = useAppState();
  const isSavedPlace = saved.includes(location.id);
  const imageSrc =
    resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 300) ||
    FALLBACK_IMAGE;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <PlatformIcon platform={platform} className="h-4 w-4 text-foreground-secondary" />
        <span className="font-mono text-[10px] uppercase tracking-wide text-stone">
          {isNewLocation ? "Community Discovery" : "Found in Koku"}
        </span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-stone">
          {confidence}
        </span>
      </div>

      {/* Location card */}
      <Link
        href={`/places?location=${location.id}`}
        className="group block"
      >
        <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-xl">
          <Image
            src={imageSrc}
            alt={location.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            sizes="(max-width: 480px) 100vw, 400px"
            unoptimized
          />
        </div>
        <h3 className="text-base font-medium text-foreground group-hover:text-brand-primary transition-colors">
          {location.name}
        </h3>
        {locationNameJapanese && (
          <p className="text-sm text-foreground-secondary">{locationNameJapanese}</p>
        )}
        <div className="mt-1 flex items-center gap-3 text-sm text-foreground-secondary">
          <span className="capitalize">{location.category}</span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {location.city}
          </span>
          {location.rating && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-brand-secondary text-brand-secondary" />
              {Number(location.rating).toFixed(1)}
            </span>
          )}
        </div>
      </Link>

      {location.shortDescription && (
        <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
          {location.shortDescription}
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleSave(location.id)}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium transition active:scale-[0.98] ${
            isSavedPlace
              ? "border border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
              : "bg-brand-primary text-white hover:bg-brand-primary/90"
          }`}
        >
          <Heart className={`h-4 w-4 ${isSavedPlace ? "fill-current" : ""}`} />
          {isSavedPlace ? "Saved" : "Save"}
        </button>
        <Link
          href={`/places?location=${location.id}`}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border px-4 text-sm font-medium text-foreground-secondary hover:border-brand-primary/30 hover:text-foreground transition"
        >
          <ExternalLink className="h-4 w-4" />
          View
        </Link>
      </div>
    </div>
  );
}
