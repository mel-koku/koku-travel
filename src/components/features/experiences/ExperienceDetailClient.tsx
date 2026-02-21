"use client";

import { useRef } from "react";
import type { SanityExperience } from "@/types/sanityExperience";
import type { ExperienceSummary } from "@/types/experience";

import { ExperienceHero } from "./ExperienceHero";
import { ExperienceQuickFacts } from "./ExperienceQuickFacts";
import { GuidePreamble } from "@/components/features/guides/GuidePreamble";
import { PortableTextBody } from "@/components/features/guides/PortableTextBody";
import { ExperiencePracticalInfo } from "./ExperiencePracticalInfo";
import { ExperiencePlanCTA } from "./ExperiencePlanCTA";
import { ExperienceFooter } from "./ExperienceFooter";
import { LinkedLocations } from "@/components/features/guides/LinkedLocations";
import { ArticleFloatingCTA } from "@/components/features/guides/ArticleFloatingCTA";
import { GuideProgressBar } from "@/components/features/guides/GuideProgressBar";
import { useAppState } from "@/state/AppState";
import { useBookmarks } from "@/hooks/useBookmarksQuery";
import type { Location } from "@/types/location";

type ExperienceDetailClientProps = {
  experience: SanityExperience;
  relatedExperiences: ExperienceSummary[];
  locations?: Location[];
};

export function ExperienceDetailClient({
  experience,
  relatedExperiences,
  locations = [],
}: ExperienceDetailClientProps) {
  const { user } = useAppState();
  const { isBookmarked, toggleBookmark, isToggling } = useBookmarks(user?.id);
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomCtaRef = useRef<HTMLDivElement>(null);

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

      {/* Article body + sidebar grid (2fr / 1fr on xl+) */}
      <div className="xl:mx-auto xl:grid xl:max-w-[1400px] xl:grid-cols-[2fr_1fr] xl:gap-10 xl:px-8 xl:pb-16">
        <div className="xl:[&>*+*]:-mt-12">
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

          {/* Hidden on xl+ where sidebar shows locations */}
          <div className="xl:hidden">
            {locations.length > 0 && <LinkedLocations locations={locations} />}
          </div>
        </div>

        <ArticleFloatingCTA
          contentType="experience"
          slug={experience.slug}
          title={experience.title}
          locationIds={experience.locationIds ?? []}
          locations={locations}
          city={experience.city}
          region={experience.region}
          contentRef={contentRef}
          bottomCtaRef={bottomCtaRef}
        />
      </div>

      <div ref={bottomCtaRef} className="xl:hidden">
        <ExperiencePlanCTA
          experienceSlug={experience.slug}
          experienceTitle={experience.title}
          locationIds={experience.locationIds ?? []}
          city={experience.city}
          region={experience.region}
        />
      </div>

      <ExperienceFooter
        authorName={authorName}
        publishedAt={experience.publishedAt}
        relatedExperiences={relatedExperiences}
      />

      <GuideProgressBar contentRef={contentRef} />
    </article>
  );
}
