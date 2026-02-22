"use client";

import { useState, useMemo } from "react";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { GuideSummary, GuideType } from "@/types/guide";
import { GuideFilterBar } from "./GuideFilterBar";
import { GuideCard } from "./GuideCard";
import type { PagesContent } from "@/types/sanitySiteContent";
import { getCurrentSeason, type Season } from "@/lib/utils/seasonUtils";

type GuidesPageClientProps = {
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

/** Map our internal "fall" to Sanity/DB "autumn" */
function seasonToDbSeason(season: Season): string {
  return season === "fall" ? "autumn" : season;
}

export function GuidesPageClient({ guides, content }: GuidesPageClientProps) {
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
        (o) => ({
          value: o.value,
          label: o.label,
          count: typeCounts[o.value] || 0,
        })
      ),
    [typeCounts]
  );

  const filterSeasons = useMemo(
    () =>
      SEASON_OPTIONS.filter((o) => (seasonCounts[o.value] || 0) > 0).map(
        (o) => ({
          value: o.value,
          label: o.label,
          count: seasonCounts[o.value] || 0,
        })
      ),
    [seasonCounts]
  );

  // Auto-highlight current season if it has guides
  const currentDbSeason = seasonToDbSeason(getCurrentSeason());
  const hasCurrentSeasonGuides = (seasonCounts[currentDbSeason] || 0) > 0;

  const filteredGuides = useMemo(() => {
    let result = guides;
    if (selectedType) {
      result = result.filter((g) => g.guideType === selectedType);
    }
    if (selectedSeason) {
      result = result.filter((g) => g.seasons?.includes(selectedSeason));
    }
    return result;
  }, [guides, selectedType, selectedSeason]);

  if (guides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4">
        <p className="font-serif italic text-lg text-foreground">
          {content?.guidesEmptyHeading ?? "Guides are in the works"}
        </p>
        <p className="mt-2 text-sm text-stone text-center max-w-sm">
          {content?.guidesEmptyDescription ?? "We're writing them now. Explore places in the meantime."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Editorial Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-4 sm:pt-20 sm:pb-6 lg:pt-28 text-center">
        <p className="font-mono text-xs uppercase tracking-ultra text-stone">
          {guides.length} guides across Japan
        </p>

        <ScrollReveal delay={0.1} distance={20} duration={0.5}>
          <h1 className="mt-4 font-serif italic text-[clamp(2rem,4vw,3rem)] leading-[1.1] text-foreground max-w-3xl mx-auto">
            {content?.guidesHeading ?? "What the locals know, written down for the first time."}
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.2} distance={20} duration={0.5}>
          <p className="text-base text-foreground-secondary max-w-2xl mx-auto mt-6 leading-relaxed">
            {content?.guidesDescription ?? "Organized by region, season, and the kind of trip you're after."}
          </p>
        </ScrollReveal>
      </section>

      {/* Filter Bar */}
      <GuideFilterBar
        types={filterTypes}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        totalCount={guides.length}
        seasons={filterSeasons}
        selectedSeason={selectedSeason}
        onSeasonChange={setSelectedSeason}
        currentSeason={hasCurrentSeasonGuides ? currentDbSeason : null}
      />

      {/* Breathing room between filter bar and content */}
      <div className="h-4 sm:h-6" aria-hidden="true" />

      {/* Card Grid */}
      <section
        aria-label="Travel guides"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 lg:pb-20"
      >
        {filteredGuides.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
            {filteredGuides.map((guide, i) => (
              <GuideCard key={guide.id} guide={guide} index={i} eager={i < 3} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="font-serif italic text-lg text-foreground">
              {content?.guidesFilteredEmptyHeading ?? "No guides in this category yet"}
            </p>
            <p className="mt-2 text-sm text-stone">
              {content?.guidesFilteredEmptyDescription ?? "Try another filter, or browse them all."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
