"use client";

import { useRef } from "react";
import { useAppState } from "@/state/AppState";
import { useBookmarks } from "@/hooks/useBookmarksQuery";
import type { Guide, GuideSummary } from "@/types/guide";
import type { Location } from "@/types/location";

import { GuideHero } from "./GuideHero";
import { GuidePreamble } from "./GuidePreamble";
import { GuideContent } from "./GuideContent";
import { LinkedLocations } from "./LinkedLocations";
import { GuideFooter } from "./GuideFooter";
import { GuideProgressBar } from "./GuideProgressBar";

type GuideDetailClientProps = {
  guide: Guide;
  locations: Location[];
  relatedGuide?: GuideSummary | null;
};

export function GuideDetailClient({
  guide,
  locations,
  relatedGuide = null,
}: GuideDetailClientProps) {
  const { user } = useAppState();
  const { isBookmarked, toggleBookmark, isToggling } = useBookmarks(user?.id);
  const bookmarked = isBookmarked(guide.id);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-background">
      <GuideHero guide={guide} />

      <GuidePreamble
        guide={guide}
        user={user}
        bookmarked={bookmarked}
        isToggling={isToggling}
        onToggleBookmark={() => toggleBookmark(guide.id)}
      />

      <div ref={contentRef}>
        <GuideContent body={guide.body} />
      </div>

      <LinkedLocations locations={locations} />

      <GuideFooter guide={guide} relatedGuide={relatedGuide} />

      <GuideProgressBar contentRef={contentRef} />
    </div>
  );
}
