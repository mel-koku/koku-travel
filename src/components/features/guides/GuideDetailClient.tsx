"use client";

import { useRef } from "react";
import { useAppState } from "@/state/AppState";
import { useBookmarks } from "@/hooks/useBookmarksQuery";
import type { Guide, GuideSummary } from "@/types/guide";
import type { SanityGuide, SanityAuthor } from "@/types/sanityGuide";
import type { Location } from "@/types/location";

import { GuideHero } from "./GuideHero";
import { GuidePreamble } from "./GuidePreamble";
import { GuideContent } from "./GuideContent";
import { PortableTextBody } from "./PortableTextBody";
import { LinkedLocations } from "./LinkedLocations";
import { GuidePlanCTA } from "./GuidePlanCTA";
import { ArticleFloatingCTA } from "./ArticleFloatingCTA";
import { GuideFooter } from "./GuideFooter";
import { GuideProgressBar } from "./GuideProgressBar";

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

      {/* Article body + sidebar grid (2fr / 1fr on xl+) */}
      <div className="xl:mx-auto xl:grid xl:max-w-[1400px] xl:grid-cols-[2fr_1fr] xl:gap-10 xl:px-8 xl:pb-16">
        <div className="xl:[&>*+*]:-mt-12">
          <div ref={contentRef}>
            {isSanity ? (
              <PortableTextBody body={sg!.body} />
            ) : (
              <GuideContent body={g!.body} />
            )}
          </div>

          {/* Hidden on xl+ where sidebar shows locations */}
          <div className="xl:hidden">
            <LinkedLocations locations={locations} />
          </div>
        </div>

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
      </div>

      <div ref={bottomCtaRef} className="xl:hidden">
        <GuidePlanCTA
          guideSlug={slug}
          guideTitle={title}
          locationIds={locationIds}
          city={city}
          region={region}
        />
      </div>

      <GuideFooter
        authorName={authorName}
        publishedAt={publishedAt}
        relatedGuide={relatedGuide}
      />

      <GuideProgressBar contentRef={contentRef} />
    </article>
  );
}
