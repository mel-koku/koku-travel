"use client";

import { useRef } from "react";
import type { SanityExperience } from "@/types/sanityExperience";
import type { ExperienceSummary } from "@/types/experience";

import { ExperienceHero } from "./ExperienceHero";
import { ExperienceQuickFacts } from "./ExperienceQuickFacts";
import { GuidePreamble } from "@/components/features/guides/GuidePreamble";
import { PortableTextBody } from "@/components/features/guides/PortableTextBody";
import { ExperiencePracticalInfo } from "./ExperiencePracticalInfo";
import { ExperienceFooter } from "./ExperienceFooter";
import { GuideProgressBar } from "@/components/features/guides/GuideProgressBar";
import { useAppState } from "@/state/AppState";
import { useBookmarks } from "@/hooks/useBookmarksQuery";

type ExperienceDetailClientProps = {
  experience: SanityExperience;
  relatedExperiences: ExperienceSummary[];
};

export function ExperienceDetailClient({
  experience,
  relatedExperiences,
}: ExperienceDetailClientProps) {
  const { user } = useAppState();
  const { isBookmarked, toggleBookmark, isToggling } = useBookmarks(user?.id);
  const contentRef = useRef<HTMLDivElement>(null);

  const bookmarkId = `exp-${experience.slug}`;
  const bookmarked = isBookmarked(bookmarkId);
  const authorName = typeof experience.author === "string" ? experience.author : experience.author.name;

  return (
    <article className="min-h-[100dvh] bg-background">
      <ExperienceHero
        title={experience.title}
        featuredImage={experience.featuredImage?.url || ""}
        experienceType={experience.experienceType}
        city={experience.city}
        region={experience.region}
        readingTimeMinutes={experience.readingTimeMinutes}
        duration={experience.duration}
      />

      <ExperienceQuickFacts
        duration={experience.duration}
        groupSizeMin={experience.groupSizeMin}
        groupSizeMax={experience.groupSizeMax}
        difficulty={experience.difficulty}
        estimatedCost={experience.estimatedCost}
        bestSeason={experience.bestSeason}
      />

      <GuidePreamble
        summary={experience.summary}
        author={experience.author}
        publishedAt={experience.publishedAt}
        tags={experience.tags || []}
        user={user}
        bookmarked={bookmarked}
        isToggling={isToggling}
        onToggleBookmark={() => toggleBookmark(bookmarkId)}
      />

      <div ref={contentRef}>
        <PortableTextBody body={experience.body} />
      </div>

      <ExperiencePracticalInfo
        whatsIncluded={experience.whatsIncluded}
        whatToBring={experience.whatToBring}
        meetingPoint={experience.meetingPoint}
        nearestStation={experience.nearestStation}
        bookingUrl={experience.bookingUrl}
      />

      <ExperienceFooter
        authorName={authorName}
        publishedAt={experience.publishedAt}
        relatedExperiences={relatedExperiences}
      />

      <GuideProgressBar contentRef={contentRef} />
    </article>
  );
}
