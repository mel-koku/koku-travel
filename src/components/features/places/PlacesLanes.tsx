"use client";

import Image from "next/image";
import { useMemo } from "react";
import { m, useReducedMotion } from "framer-motion";

import { resizePhotoUrl } from "@/lib/google/transformations";
import { typography } from "@/lib/typography-system";
import { easeReveal, durationBase } from "@/lib/motion";
import type { Location } from "@/types/location";

const ICONIC_CATEGORIES = new Set([
  "shrine",
  "temple",
  "castle",
  "landmark",
  "historic_site",
  "viewpoint",
  "tower",
]);

const FEATURED_CITIES: Array<{ slug: string; label: string; region: string; image: string }> = [
  { slug: "tokyo", label: "Tokyo", region: "Kanto", image: "/images/regions/kanto-hero.jpg" },
  { slug: "kyoto", label: "Kyoto", region: "Kansai", image: "/images/regions/kansai-hero.jpg" },
  { slug: "osaka", label: "Osaka", region: "Kansai", image: "/images/regions/kansai-hero.jpg" },
  { slug: "kanazawa", label: "Kanazawa", region: "Chubu", image: "/images/regions/chubu-hero.jpg" },
  { slug: "hiroshima", label: "Hiroshima", region: "Chugoku", image: "/images/regions/chugoku-hero.jpg" },
  { slug: "naoshima", label: "Naoshima", region: "Shikoku", image: "/images/regions/shikoku-hero.jpg" },
];

type PlacesLanesProps = {
  locations: Location[];
  onSelect: (location: Location) => void;
  onCitySelect: (citySlug: string) => void;
};

export function PlacesLanes({ locations, onSelect, onCitySelect }: PlacesLanesProps) {
  const prefersReducedMotion = useReducedMotion();

  const iconic = useMemo(() => {
    return locations
      .filter((l) => ICONIC_CATEGORIES.has(l.category) || l.isUnescoSite || l.isFeatured)
      .filter((l) => l.primaryPhotoUrl || l.image)
      .sort((a, b) => {
        const scoreA = (a.rating ?? 0) * Math.log10((a.reviewCount ?? 0) + 10);
        const scoreB = (b.rating ?? 0) * Math.log10((b.reviewCount ?? 0) + 10);
        return scoreB - scoreA;
      })
      .slice(0, 8);
  }, [locations]);

  const containers = useMemo(() => {
    return locations
      .filter((l) => l.parentMode === "container")
      .filter((l) => l.primaryPhotoUrl || l.image)
      .slice(0, 12);
  }, [locations]);

  if (locations.length === 0) return null;

  const fadeIn = prefersReducedMotion
    ? undefined
    : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-10%" } };

  return (
    <section
      aria-label="Editorial entry points"
      className="mx-auto max-w-7xl space-y-12 px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12"
    >
      {iconic.length > 0 && (
        <Lane
          eyebrow="Iconic Japan"
          intro="The places that anchor a first trip."
          motionProps={fadeIn}
        >
          <HorizontalRail>
            {iconic.map((loc) => (
              <PlaceTile key={loc.id} location={loc} onSelect={onSelect} />
            ))}
          </HorizontalRail>
        </Lane>
      )}

      <Lane
        eyebrow="Cities"
        intro="Pick a base. We'll narrow the rest."
        motionProps={fadeIn}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {FEATURED_CITIES.map((city) => (
            <CityTile key={city.slug} city={city} onSelect={onCitySelect} />
          ))}
        </div>
      </Lane>

      {containers.length > 0 && (
        <Lane
          eyebrow="Districts and clusters"
          intro="Walking neighborhoods, hot-spring towns, gallery rows."
          motionProps={fadeIn}
        >
          <HorizontalRail>
            {containers.map((loc) => (
              <PlaceTile key={loc.id} location={loc} onSelect={onSelect} variant="container" />
            ))}
          </HorizontalRail>
        </Lane>
      )}
    </section>
  );
}

function Lane({
  eyebrow,
  intro,
  children,
  motionProps,
}: {
  eyebrow: string;
  intro: string;
  children: React.ReactNode;
  motionProps?: Parameters<typeof m.div>[0];
}) {
  return (
    <m.div
      {...motionProps}
      transition={{ duration: durationBase, ease: easeReveal }}
      className="space-y-4"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow-editorial">{eyebrow}</p>
          <p className={`${typography({ intent: "utility-body-muted" })} mt-1`}>{intro}</p>
        </div>
      </div>
      {children}
    </m.div>
  );
}

function HorizontalRail({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto overscroll-contain px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex snap-x snap-mandatory gap-3 sm:gap-4">{children}</div>
    </div>
  );
}

function PlaceTile({
  location,
  onSelect,
  variant = "place",
}: {
  location: Location;
  onSelect: (location: Location) => void;
  variant?: "place" | "container";
}) {
  const imageSrc = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 600);
  const subtitle = variant === "container"
    ? location.region
    : `${location.city}, ${location.region}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(location)}
      className="group relative w-44 shrink-0 snap-start overflow-hidden rounded-lg bg-surface text-left shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary sm:w-56"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-canvas">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={location.name}
            fill
            sizes="(min-width:1024px) 224px, 176px"
            className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
          />
        ) : null}
        <div className="absolute inset-0 scrim-50" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-2 text-sm font-medium text-white">{location.name}</p>
          <p className="text-[11px] uppercase tracking-wide text-white/80">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

function CityTile({
  city,
  onSelect,
}: {
  city: { slug: string; label: string; region: string; image: string };
  onSelect: (citySlug: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(city.slug)}
      className="group relative block aspect-[4/5] w-full overflow-hidden rounded-lg bg-surface text-left shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
    >
      <Image
        src={city.image}
        alt={city.label}
        fill
        sizes="(min-width:1024px) 200px, 50vw"
        className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 scrim-60" />
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <p className="text-base font-medium text-white sm:text-lg">{city.label}</p>
        <p className="text-[11px] uppercase tracking-wide text-white/80">{city.region}</p>
      </div>
    </button>
  );
}
