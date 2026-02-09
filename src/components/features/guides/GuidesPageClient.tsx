"use client";

import { useState, useMemo } from "react";

import type { GuideSummary, GuideType } from "@/types/guide";
import { GuideHeroSpread } from "./GuideHeroSpread";
import { GuideFilterBar } from "./GuideFilterBar";
import { GuideEditorialRow } from "./GuideEditorialRow";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

type GuidesPageClientProps = {
  guides: GuideSummary[];
};

const GUIDE_TYPE_OPTIONS: { value: GuideType; label: string }[] = [
  { value: "itinerary", label: "Itinerary" },
  { value: "listicle", label: "Top Picks" },
  { value: "deep_dive", label: "Deep Dive" },
  { value: "seasonal", label: "Seasonal" },
];

export function GuidesPageClient({ guides }: GuidesPageClientProps) {
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
        <SplitText
          as="p"
          className="justify-center font-serif italic text-lg text-foreground"
          splitBy="word"
          animation="clipY"
          staggerDelay={0.06}
        >
          Guides are on the way
        </SplitText>
        <ScrollReveal delay={0.3} distance={15}>
          <p className="mt-2 text-sm text-stone text-center max-w-sm">
            We&apos;re writing curated travel guides. Check back soon.
          </p>
        </ScrollReveal>
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
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24"
      >
        {listingGuides.length > 0 ? (
          <div className="space-y-16 lg:space-y-24">
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
              Nothing here yet
            </p>
            <p className="mt-2 text-sm text-stone">
              Try selecting a different category above.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
