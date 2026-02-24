"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import { resizePhotoUrl } from "@/lib/google/transformations";

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type AskKokuLocationCardProps = {
  id: string;
  name: string;
  category: string;
  city: string;
  rating: number | null;
  image: string;
  primaryPhotoUrl: string | null;
};

export function AskKokuLocationCardB({
  id,
  name,
  category,
  city,
  rating,
  image,
  primaryPhotoUrl,
}: AskKokuLocationCardProps) {
  const imageSrc = resizePhotoUrl(primaryPhotoUrl ?? image, 200) || FALLBACK_IMAGE;

  return (
    <Link
      href={`/b/places?location=${id}`}
      className="group flex items-center gap-3 rounded-xl bg-white p-2 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
        <Image
          src={imageSrc}
          alt={name}
          fill
          className="object-cover"
          sizes="48px"
          unoptimized
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
          {name}
        </p>
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span className="capitalize">{category}</span>
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {city}
          </span>
          {rating && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
