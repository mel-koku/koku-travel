"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { GuideCardB } from "./GuideCardB";
import type { GuideSummary, GuideType } from "@/types/guide";
import type { PagesContent } from "@/types/sanitySiteContent";
import { getCurrentSeason, type Season } from "@/lib/utils/seasonUtils";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type GuidesPageClientBProps = {
  guides: GuideSummary[];
  content?: PagesContent;
};

const GUIDE_TYPE_OPTIONS: { value: GuideType; label: string }[] = [
  { value: "itinerary", label: "Itinerary" },
  { value: "listicle", label: "Top Picks" },
  { value: "deep_dive", label: "Deep Dive" },
  { value: "seasonal", label: "Seasonal" },
];

const SEASON_OPTIONS: { value: string; label: string }[] = [
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "autumn", label: "Autumn" },
  { value: "winter", label: "Winter" },
];

function seasonToDbSeason(season: Season): string {
  return season === "fall" ? "autumn" : season;
}

export function GuidesPageClientB({ guides, content }: GuidesPageClientBProps) {
  const [selectedType, setSelectedType] = useState<GuideType | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    guides.forEach((g) => {
      counts[g.guideType] = (counts[g.guideType] || 0) + 1;
    });
    return counts;
  }, [guides]);

  const seasonCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    guides.forEach((g) => {
      if (g.seasons) {
        for (const s of g.seasons) {
          if (s !== "year-round") {
            counts[s] = (counts[s] || 0) + 1;
          }
        }
      }
    });
    return counts;
  }, [guides]);

  const filterTypes = useMemo(
    () =>
      GUIDE_TYPE_OPTIONS.filter((o) => (typeCounts[o.value] || 0) > 0).map(
        (o) => ({ value: o.value, label: o.label, count: typeCounts[o.value] || 0 })
      ),
    [typeCounts]
  );

  const filterSeasons = useMemo(
    () =>
      SEASON_OPTIONS.filter((o) => (seasonCounts[o.value] || 0) > 0).map(
        (o) => ({ value: o.value, label: o.label, count: seasonCounts[o.value] || 0 })
      ),
    [seasonCounts]
  );

  const currentDbSeason = seasonToDbSeason(getCurrentSeason());
  const hasCurrentSeasonGuides = (seasonCounts[currentDbSeason] || 0) > 0;

  const filteredGuides = useMemo(() => {
    let result = guides;
    if (selectedType) result = result.filter((g) => g.guideType === selectedType);
    if (selectedSeason) result = result.filter((g) => g.seasons?.includes(selectedSeason));
    return result;
  }, [guides, selectedType, selectedSeason]);

  if (guides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4">
        <p className="text-lg font-semibold text-[var(--foreground)]">
          {content?.guidesEmptyHeading ?? "Guides are in the works"}
        </p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)] text-center max-w-sm">
          {content?.guidesEmptyDescription ?? "Still writing these \u2014 browse places while we finish."}
        </p>
        <a
          href="/b/places"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-sm font-medium text-white active:scale-[0.98]"
        >
          Browse places
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 lg:pt-36 pb-4 sm:pb-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: bEase }}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
        >
          {guides.length} guides across Japan
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
          className="mt-4 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] text-[var(--foreground)] max-w-3xl mx-auto"
        >
          {content?.guidesHeading ?? "What the locals know, written down for the first time."}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.2 }}
          className="text-base text-[var(--foreground-body)] max-w-2xl mx-auto mt-6 leading-relaxed"
        >
          {content?.guidesDescription ?? "Organized by region, season, and the kind of trip you're after."}
        </motion.p>
      </section>

      {/* Filter Bar — Type */}
      <div className="sticky top-[var(--header-h)] z-40 bg-white/95 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className="overflow-x-auto scrollbar-hide overscroll-contain py-3"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2 min-w-max">
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className={cn(
                  "px-4 py-2.5 min-h-[44px] text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
                  selectedType === null
                    ? "border-[var(--primary)] text-[var(--foreground)]"
                    : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                All
                <span className="ml-1.5 text-xs text-[var(--muted-foreground)]">{guides.length}</span>
              </button>
              {filterTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(selectedType === type.value ? null : type.value)}
                  className={cn(
                    "px-4 py-2.5 min-h-[44px] text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
                    selectedType === type.value
                      ? "border-[var(--primary)] text-[var(--foreground)]"
                      : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  {type.label}
                  <span className="ml-1.5 text-xs text-[var(--muted-foreground)]">{type.count}</span>
                </button>
              ))}

              {/* Season pills */}
              {filterSeasons.length > 0 && (
                <>
                  <div className="h-5 w-px bg-[var(--border)] mx-2" />
                  {filterSeasons.map((season) => (
                    <button
                      key={season.value}
                      type="button"
                      onClick={() => setSelectedSeason(selectedSeason === season.value ? null : season.value)}
                      className={cn(
                        "px-3 py-1.5 min-h-[36px] text-xs font-medium whitespace-nowrap rounded-full transition-all",
                        selectedSeason === season.value
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--surface)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                        season.value === currentDbSeason && hasCurrentSeasonGuides && !selectedSeason
                          ? "ring-1 ring-[var(--primary)]/30"
                          : ""
                      )}
                    >
                      {season.label}
                      <span className="ml-1 opacity-60">{season.count}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-4 sm:h-6" aria-hidden="true" />

      {/* Card Grid */}
      <section
        aria-label="Travel guides"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 lg:pb-32"
      >
        {filteredGuides.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
            {filteredGuides.map((guide, i) => (
              <motion.div
                key={guide.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: bEase, delay: 0.1 + i * 0.08 }}
              >
                <GuideCardB guide={guide} index={i} eager={i < 3} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-lg font-semibold text-[var(--foreground)]">
              {content?.guidesFilteredEmptyHeading ?? "No guides in this category yet"}
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {content?.guidesFilteredEmptyDescription ?? "Try another filter, or browse them all."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
