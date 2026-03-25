"use client";

import { useCallback, useRef, useState } from "react";
import { useAppState } from "@/state/AppState";
import { useBookmarks } from "@/hooks/useBookmarksQuery";
import type { Guide, GuideSummary } from "@/types/guide";
import type { SanityGuide, SanityAuthor } from "@/types/sanityGuide";
import type { Location } from "@/types/location";

import { GuideHero } from "./GuideHero";
import { GuidePreamble } from "./GuidePreamble";
import { LocationStripTOC } from "./LocationStripTOC";
import { GuideLocationsProvider } from "./GuideLocationsContext";
import { PortableTextBody } from "./PortableTextBody";
import { GuideContentWithLocations } from "./GuideContentWithLocations";
import { LinkedLocations } from "./LinkedLocations";
import { GuidePlanCTA } from "./GuidePlanCTA";
import { ArticleFloatingCTA } from "./ArticleFloatingCTA";
import { GuideFooter } from "./GuideFooter";
import { GuideProgressBar } from "./GuideProgressBar";
import { LocationExpanded } from "@/components/features/places/LocationExpanded";

type GuideDetailClientProps =
  | {
      source: "supabase";
      guide: Guide;
      sanityGuide?: never;
      locations: Location[];
      relatedGuide?: GuideSummary | null;
    }
  | {
      source: "sanity";
      sanityGuide: SanityGuide;
      guide?: never;
      locations: Location[];
      relatedGuide?: GuideSummary | null;
    };

export function GuideDetailClient(props: GuideDetailClientProps) {
  const { locations, relatedGuide = null, source } = props;
  const { user } = useAppState();
  const { isBookmarked, toggleBookmark, isToggling } = useBookmarks(user?.id);
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomCtaRef = useRef<HTMLDivElement>(null);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);

  const handleSelectLocation = useCallback((location: Location) => {
    setExpandedLocation(location);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setExpandedLocation(null);
  }, []);

  const isSanity = source === "sanity";
  const sg = isSanity ? props.sanityGuide : undefined;
  const g = !isSanity ? props.guide : undefined;

  const guideId = isSanity ? sg!.slug : g!.id;
  const bookmarked = isBookmarked(guideId);

  const title = isSanity ? sg!.title : g!.title;
  const summary = isSanity ? sg!.summary : g!.summary;
  const tags = isSanity ? sg!.tags || [] : g!.tags;
  const publishedAt = isSanity ? sg!.publishedAt : g!.publishedAt;
  const guideType = isSanity ? sg!.guideType : g!.guideType;
  const city = isSanity ? sg!.city : g!.city;
  const region = isSanity ? sg!.region : g!.region;
  const readingTimeMinutes = isSanity ? sg!.readingTimeMinutes : g!.readingTimeMinutes;
  const locationIds = isSanity ? sg!.locationIds || [] : g!.locationIds || [];
  const slug = isSanity ? sg!.slug : g!.id;
  const featuredImage = isSanity ? sg!.featuredImage?.url || "" : g!.featuredImage;
  const author: string | SanityAuthor = isSanity ? sg!.author : g!.author;
  const authorName = typeof author === "string" ? author : author.name;

  return (
    <article className="min-h-[100dvh] bg-background">
      <GuideHero
        title={title}
        featuredImage={featuredImage}
        guideType={guideType}
        city={city}
        region={region}
        readingTimeMinutes={readingTimeMinutes}
      />

      <GuidePreamble
        summary={summary}
        author={author}
        publishedAt={publishedAt}
        tags={tags}
        user={user}
        bookmarked={bookmarked}
        isToggling={isToggling}
        onToggleBookmark={() => toggleBookmark(guideId)}
      />

      {/* Visual table of contents: horizontal location strip */}
      {locations.length > 0 && <LocationStripTOC locations={locations} />}

      {/* Single-column article with inline location cards */}
      <GuideLocationsProvider locations={locations} onSelectLocation={handleSelectLocation}>
        <div ref={contentRef}>
          {isSanity ? (
            <PortableTextBody body={sg!.body} />
          ) : (
            <GuideContentWithLocations body={g!.body} locations={locations} />
          )}
        </div>
      </GuideLocationsProvider>

      {/* All locations as a visual recap grid */}
      <LinkedLocations locations={locations} />

      {/* Plan CTA */}
      <div ref={bottomCtaRef}>
        <GuidePlanCTA
          guideSlug={slug}
          guideTitle={title}
          locationIds={locationIds}
          city={city}
          region={region}
        />
      </div>

      {/* Floating pill CTA while reading */}
      {locationIds.length > 0 && (
        <ArticleFloatingCTA
          contentType="guide"
          slug={slug}
          title={title}
          locationIds={locationIds}
          locations={locations}
          city={city}
          region={region}
          contentRef={contentRef}
          bottomCtaRef={bottomCtaRef}
        />
      )}

      <GuideFooter
        authorName={authorName}
        publishedAt={publishedAt}
        relatedGuide={relatedGuide}
      />

      <GuideProgressBar contentRef={contentRef} />

      {expandedLocation && (
        <LocationExpanded
          location={expandedLocation}
          onClose={handleCloseExpanded}
        />
      )}
    </article>
  );
}
