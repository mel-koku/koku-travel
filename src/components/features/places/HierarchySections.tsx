"use client";

import { m } from "framer-motion";
import { Clock } from "lucide-react";
import { easeReveal } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import type { Location, SubExperience, LocationRelationship } from "@/types/location";
import { LocationCard } from "./LocationCard";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [...easeReveal] as [number, number, number, number] },
  },
};

// ============================================
// Children Section ("Things to do here")
// ============================================

export function ChildLocationsSection({
  childLocations,
  parentName,
  onSelect,
}: {
  childLocations: Location[];
  parentName: string;
  onSelect?: (location: Location) => void;
}) {
  if (childLocations.length === 0) return null;

  return (
    <m.section
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <h3 className={cn(typography({ intent: "utility-h2" }), "px-1")}>
        Things to do in {parentName}
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {childLocations.map((child) => (
          <LocationCard
            key={child.id}
            location={child}
            variant="compact"
            onSelect={onSelect}
          />
        ))}
      </div>
    </m.section>
  );
}

// ============================================
// Sub-experience Teaser (above the fold)
// ============================================

export function SubExperienceTeaser({
  subExperiences,
  onScrollTo,
}: {
  subExperiences: SubExperience[];
  onScrollTo: () => void;
}) {
  if (subExperiences.length === 0) return null;

  const highlights = subExperiences.filter((s) => s.subType === "highlight");
  const routeStops = subExperiences.filter((s) => s.subType === "route_stop");

  // Pick the best label based on what types exist
  const hasRoute = routeStops.length > 0;
  const items = highlights.length > 0 ? highlights : routeStops;
  if (items.length === 0) return null;

  const maxShow = 2;
  const shown = items.slice(0, maxShow);
  const remaining = subExperiences.length - shown.length;

  return (
    <button
      type="button"
      onClick={onScrollTo}
      className="flex w-full items-start gap-2.5 rounded-md bg-surface px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-border/40"
    >
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
      </svg>
      <span className="text-foreground-secondary">
        <span className="font-medium text-foreground">
          {hasRoute && highlights.length === 0 ? "Walking route" : "Highlights"}:
        </span>{" "}
        {shown.map((s) => s.name).join(", ")}
        {remaining > 0 && (
          <span className="text-stone"> +{remaining} more</span>
        )}
      </span>
    </button>
  );
}

// ============================================
// Sub-experiences Section
// ============================================

function SubExperienceCard({
  item,
  stopNumber,
}: {
  item: SubExperience;
  stopNumber?: number;
}) {
  const typeLabel =
    item.subType === "highlight"
      ? null
      : item.subType === "route_stop"
        ? stopNumber != null
          ? `Stop ${stopNumber}`
          : null
        : item.timeContext
          ? item.timeContext.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
          : null;

  return (
    <div className="rounded-lg bg-surface p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-sans text-sm font-semibold text-foreground">
          {item.name}
        </h3>
        {item.timeEstimate && (
          <span className="shrink-0 inline-flex items-center gap-1 font-mono text-xs text-foreground-secondary">
            <Clock className="h-3 w-3" />
            {item.timeEstimate}min
          </span>
        )}
      </div>
      {typeLabel && (
        <span className="inline-block rounded-md bg-canvas px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-foreground-secondary">
          {typeLabel}
        </span>
      )}
      <p className="text-sm leading-relaxed text-foreground-body">
        {item.description}
      </p>
      {item.tip && (
        <p className="border-l-2 border-brand-primary/30 pl-3 text-sm italic text-foreground-secondary">
          {item.tip}
        </p>
      )}
    </div>
  );
}

export function SubExperiencesSection({
  subExperiences,
}: {
  subExperiences: SubExperience[];
}) {
  if (subExperiences.length === 0) return null;

  const highlights = subExperiences.filter((s) => s.subType === "highlight");
  const routeStops = subExperiences.filter((s) => s.subType === "route_stop");
  const timeVariants = subExperiences.filter((s) => s.subType === "time_variant");

  return (
    <m.section
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {highlights.length > 0 && (
        <div className="space-y-3">
          <h3 className={cn(typography({ intent: "utility-h2" }), "px-1")}>
            Highlights
          </h3>
          <p className="px-1 text-sm text-foreground-secondary">
            What stands out once you&apos;re here.
          </p>
          <div className="space-y-3">
            {highlights.map((item) => (
              <SubExperienceCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
      {routeStops.length > 0 && (
        <div className="space-y-3">
          <h3 className={cn(typography({ intent: "utility-h2" }), "px-1")}>
            Walking route
          </h3>
          <p className="px-1 text-sm text-foreground-secondary">
            A suggested path through the grounds.
          </p>
          <div className="space-y-3">
            {routeStops.map((item, idx) => (
              <SubExperienceCard key={item.id} item={item} stopNumber={idx + 1} />
            ))}
          </div>
        </div>
      )}
      {timeVariants.length > 0 && (
        <div className="space-y-3">
          <h3 className={cn(typography({ intent: "utility-h2" }), "px-1")}>
            Also experience
          </h3>
          <p className="px-1 text-sm text-foreground-secondary">
            Same place, different time of day.
          </p>
          <div className="space-y-3">
            {timeVariants.map((item) => (
              <SubExperienceCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </m.section>
  );
}

// ============================================
// Relationships Section
// ============================================

type NearbyLocation = Location & { walkMinutes: number };

export function RelationshipsSection({
  relationships,
  nearby = [],
  onSelect,
}: {
  relationships: (LocationRelationship & { relatedLocation?: Location })[];
  /**
   * Coord-proximity fallback for "In this area". Used only when
   * `relationships` has no curated clusters. Server-side gating happens
   * in `fetchHierarchyContext` — this component just renders what it gets.
   */
  nearby?: NearbyLocation[];
  onSelect?: (location: Location) => void;
}) {
  const clusters = relationships.filter((r) => r.relationshipType === "cluster" && r.relatedLocation);
  const alternatives = relationships.filter((r) => r.relationshipType === "alternative" && r.relatedLocation);

  // Curated clusters win. Coord-prox fills in only when curated is empty.
  const inThisArea: { id: string; location: Location; walkMinutes?: number }[] =
    clusters.length > 0
      ? clusters.slice(0, 6).map((rel) => ({
          id: rel.id,
          location: rel.relatedLocation!,
          walkMinutes: rel.walkMinutes,
        }))
      : nearby.map((loc) => ({
          id: loc.id,
          location: loc,
          walkMinutes: loc.walkMinutes,
        }));

  if (inThisArea.length === 0 && alternatives.length === 0) return null;

  return (
    <>
      {inThisArea.length > 0 && (
        <m.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <h3 className={cn(typography({ intent: "utility-h2" }), "px-1")}>
            In this area
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {inThisArea.map((entry) => (
              <LocationCard
                key={entry.id}
                location={entry.location}
                variant="compact"
                meta={entry.walkMinutes ? `${entry.walkMinutes} min walk` : undefined}
                onSelect={onSelect}
              />
            ))}
          </div>
        </m.section>
      )}
      {alternatives.length > 0 && (
        <m.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <h3 className={cn(typography({ intent: "utility-h2" }), "px-1")}>
            Consider instead
          </h3>
          <div className="space-y-2">
            {alternatives.map((rel) => (
              <div key={rel.id} className="space-y-1">
                <LocationCard
                  location={rel.relatedLocation!}
                  variant="compact"
                  onSelect={onSelect}
                />
                {rel.editorialNote && (
                  <p className="px-1 text-xs text-foreground-secondary">
                    {rel.editorialNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </m.section>
      )}
    </>
  );
}
