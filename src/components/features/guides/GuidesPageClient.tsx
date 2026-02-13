"use client";

import { useState, useMemo } from "react";

import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { GuideSummary, GuideType } from "@/types/guide";
import { GuideFilterBar } from "./GuideFilterBar";
import { GuideCard } from "./GuideCard";
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

  const filteredGuides = useMemo(() => {
    if (!selectedType) return guides;
    return guides.filter((g) => g.guideType === selectedType);
  }, [guides, selectedType]);

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
      {/* Editorial Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 pb-4 sm:pt-36 sm:pb-6">
        <p className="font-mono text-xs uppercase tracking-ultra text-stone mb-4">
          {guides.length} guides across Japan
        </p>

        <SplitText
          as="h1"
          className="font-serif italic text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] text-foreground max-w-4xl"
          splitBy="word"
          animation="clipY"
          staggerDelay={0.04}
          duration={0.5}
          delay={0.1}
        >
          {content?.guidesHeading ?? "The local knowledge that turns a good trip into an unforgettable one."}
        </SplitText>

        <ScrollReveal delay={0.3} distance={20} duration={0.5}>
          <p className="text-base text-foreground-secondary max-w-2xl mt-6">
            {content?.guidesDescription ?? "Curated guides by region, season, and style. Pick a category or start browsing."}
          </p>
        </ScrollReveal>
      </section>

      {/* Filter Bar */}
      <GuideFilterBar
        types={filterTypes}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        totalCount={guides.length}
      />

      {/* Card Grid */}
      <section
        aria-label="Travel guides"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-28"
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
