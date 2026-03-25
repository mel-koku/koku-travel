"use client";

import Image from "next/image";
import { useCallback } from "react";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { staggerItem } from "@/lib/motion";
import type { Location } from "@/types/location";

type LocationStripTOCProps = {
  locations: Location[];
};

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export function LocationStripTOC({ locations }: LocationStripTOCProps) {
  const handleClick = useCallback((id: string) => {
    const el = document.querySelector(`[data-location-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  if (locations.length === 0) return null;

  return (
    <section className="bg-background py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal distance={20}>
          <p className="eyebrow-editorial mb-4 text-center">
            {locations.length} places in this guide
          </p>
        </ScrollReveal>

        {/* Horizontal scroll strip */}
        <div className="scrollbar-hide -mx-6 flex justify-center gap-3 overflow-x-auto px-6 pb-2 snap-x snap-mandatory overscroll-contain sm:gap-4">
          {locations.map((loc, i) => {
            const imgSrc =
              resizePhotoUrl(loc.primaryPhotoUrl || loc.image, 300) ||
              FALLBACK_IMAGE;

            return (
              <ScrollReveal
                key={loc.id}
                className="snap-start shrink-0"
                stagger={i * staggerItem}
                distance={20}
              >
                <button
                  type="button"
                  onClick={() => handleClick(loc.id)}
                  className="group relative w-28 overflow-hidden rounded-lg sm:w-36"
                >
                  <div className="relative aspect-[4/5]">
                    <Image
                      src={imgSrc}
                      alt={loc.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                      sizes="(min-width: 640px) 144px, 112px"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 scrim-60" />
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <p className="text-left font-serif text-xs leading-tight text-white line-clamp-2 sm:text-sm">
                      {loc.name}
                    </p>
                    <p className="mt-0.5 text-left font-mono text-[9px] uppercase tracking-wide text-white/60">
                      {loc.city}
                    </p>
                  </div>
                </button>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
