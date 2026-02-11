"use client";

import { useState, useMemo } from "react";

import type { GuideSummary, GuideType } from "@/types/guide";
import { GuideHeroSpread } from "./GuideHeroSpread";
import { GuideFilterBar } from "./GuideFilterBar";
import { GuideEditorialRow } from "./GuideEditorialRow";
import type { PagesContent } from "@/types/sanitySiteContent";

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

export function GuidesPageClient({ guides, content }: GuidesPageClientProps) {
  const [selectedType, setSelectedType] = useState<GuideType | null>(null);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    guides.forEach((g) => {
      counts[g.guideType] = (counts[g.guideType] || 0) + 1;
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

  const isFiltered = selectedType !== null;

  const filteredGuides = useMemo(() => {
    if (!isFiltered) return guides;
    return guides.filter((g) => g.guideType === selectedType);
  }, [guides, selectedType, isFiltered]);

  // Hero = first guide (only when "All" is selected)
  const heroGuide = !isFiltered && guides.length > 0 ? guides[0] : null;

  // Listing = remaining guides (skip hero when showing all)
  const listingGuides = heroGuide ? filteredGuides.slice(1) : filteredGuides;

  if (guides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4">
        <p className="font-serif italic text-lg text-foreground">
          {content?.guidesEmptyHeading ?? "Guides are on the way"}
        </p>
        <p className="mt-2 text-sm text-stone text-center max-w-sm">
          {content?.guidesEmptyDescription ?? "We're writing curated travel guides. Check back soon."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Zone A — Hero Feature */}
      {heroGuide && <GuideHeroSpread guide={heroGuide} />}

      {/* Zone B — Filter Bar */}
      <GuideFilterBar
        types={filterTypes}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        totalCount={guides.length}
      />

      {/* Zone C — Editorial Listing */}
      <section
        aria-label="Travel guides"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-28"
      >
        {listingGuides.length > 0 ? (
          <div className="space-y-10 sm:space-y-16 lg:space-y-24">
            {listingGuides.map((guide, i) => (
              <GuideEditorialRow
                key={guide.id}
                guide={guide}
                index={heroGuide ? i + 1 : i}
                flip={i % 2 === 1}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="font-serif italic text-lg text-foreground">
              {content?.guidesFilteredEmptyHeading ?? "Nothing here yet"}
            </p>
            <p className="mt-2 text-sm text-stone">
              {content?.guidesFilteredEmptyDescription ?? "Try selecting a different category above."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
