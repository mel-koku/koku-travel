"use client";

import { motion } from "framer-motion";
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
}: {
  childLocations: Location[];
  parentName: string;
}) {
  if (childLocations.length === 0) return null;

  return (
    <motion.section
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
          />
        ))}
      </div>
    </motion.section>
  );
}

// ============================================
// Sub-experiences Section
// ============================================

function SubExperienceCard({ item }: { item: SubExperience }) {
  const typeLabel =
    item.subType === "highlight"
      ? null
      : item.subType === "route_stop"
        ? `Stop ${item.sortOrder}`
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
          <span className="shrink-0 font-mono text-xs text-foreground-secondary">
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
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {highlights.length > 0 && (
        <div className="space-y-3">
          <h3 className={cn(typography({ intent: "utility-h2" }), "px-1")}>
            Don&apos;t miss
          </h3>
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
          <div className="space-y-3">
            {routeStops.map((item) => (
              <SubExperienceCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
      {timeVariants.length > 0 && (
        <div className="space-y-3">
          <h3 className={cn(typography({ intent: "utility-h2" }), "px-1")}>
            Also experience
          </h3>
          <div className="space-y-3">
            {timeVariants.map((item) => (
              <SubExperienceCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </motion.section>
  );
}

// ============================================
// Relationships Section
// ============================================

export function RelationshipsSection({
  relationships,
}: {
  relationships: (LocationRelationship & { relatedLocation?: Location })[];
}) {
  if (relationships.length === 0) return null;

  const clusters = relationships.filter((r) => r.relationshipType === "cluster" && r.relatedLocation);
  const alternatives = relationships.filter((r) => r.relationshipType === "alternative" && r.relatedLocation);

  return (
    <>
      {clusters.length > 0 && (
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <h3 className={cn(typography({ intent: "utility-h2" }), "px-1")}>
            In this area
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {clusters.slice(0, 6).map((rel) => (
              <LocationCard
                key={rel.id}
                location={rel.relatedLocation!}
                variant="compact"
                meta={rel.walkMinutes ? `${rel.walkMinutes} min walk` : undefined}
              />
            ))}
          </div>
        </motion.section>
      )}
      {alternatives.length > 0 && (
        <motion.section
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
                />
                {rel.editorialNote && (
                  <p className="px-1 text-xs text-foreground-secondary">
                    {rel.editorialNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </>
  );
}
