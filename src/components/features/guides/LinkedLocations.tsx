"use client";

import Image from "next/image";
import Link from "next/link";

import { resizePhotoUrl } from "@/lib/google/transformations";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useCursor } from "@/providers/CursorProvider";
import { staggerItem, easeCinematicCSS } from "@/lib/motion";
import type { Location } from "@/types/location";

type LinkedLocationsProps = {
  locations: Location[];
};

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export function LinkedLocations({ locations }: LinkedLocationsProps) {
  const { setCursorState, isEnabled } = useCursor();

  if (locations.length === 0) {
    return null;
  }

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}
        <ScrollReveal distance={20}>
          <p className="mb-2 font-mono text-xs uppercase tracking-wide text-stone">
            Featured in this guide
          </p>
          <h2 className="font-serif text-2xl italic text-foreground sm:text-3xl">
            Places to Visit
          </h2>
        </ScrollReveal>

        {/* Asymmetric grid */}
        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {locations.map((location, i) => {
            const imageSrc =
              resizePhotoUrl(
                location.primaryPhotoUrl || location.image,
                800
              ) || FALLBACK_IMAGE;
            const isFeatured = i === 0;

            return (
              <ScrollReveal
                key={location.id}
                className={
                  isFeatured
                    ? "lg:col-span-1 lg:row-span-2"
                    : ""
                }
                stagger={i * staggerItem}
                distance={30}
              >
                <Link
                  href={`/explore?location=${location.id}`}
                  className="group relative block h-full overflow-hidden rounded-xl"
                  onMouseEnter={() =>
                    isEnabled && setCursorState("explore")
                  }
                  onMouseLeave={() =>
                    isEnabled && setCursorState("default")
                  }
                >
                  <div
                    className={`relative w-full ${
                      isFeatured
                        ? "aspect-[3/4]"
                        : "aspect-[16/9] lg:aspect-[4/3]"
                    }`}
                  >
                    <Image
                      src={imageSrc}
                      alt={location.name}
                      fill
                      className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.02]"
                      style={{ transitionTimingFunction: easeCinematicCSS }}
                      sizes={
                        isFeatured
                          ? "(min-width: 1024px) 33vw, 95vw"
                          : "(min-width: 1024px) 33vw, 95vw"
                      }
                      loading="lazy"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent" />
                  </div>

                  {/* Overlay text */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                    <h3 className="font-serif text-lg italic text-white sm:text-xl">
                      {location.name}
                    </h3>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-white/50">
                      {location.city}
                      {location.region &&
                        location.city !== location.region &&
                        ` \u00b7 ${location.region}`}
                    </p>
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
