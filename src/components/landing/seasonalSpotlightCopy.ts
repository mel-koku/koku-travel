import type { Season, SeasonalHighlight } from "@/lib/utils/seasonUtils";
import type { LandingPageContent } from "@/types/sanitySiteContent";

const SEASON_HEADINGS: Record<Season, string> = {
  spring: "Cherry blossoms and fresh starts",
  summer: "Festivals, fireworks, and cool escapes",
  fall: "Koyo colors at their peak",
  winter: "Hot springs and illuminations",
};

const HIGHLIGHT_CTA_TEXT: Record<string, string> = {
  "cherry-blossom": "See sakura at peak",
  "cherry-blossom-late": "See late-blooming sakura",
  "plum-blossom": "See ume in bloom",
  "autumn-foliage": "See koyo at peak",
  "winter-illumination": "See illuminations on now",
  "summer-festival": "See festivals on now",
};

const DEFAULT_DESCRIPTION = "Places and guides at their best right now.";
const DEFAULT_CTA = "See all seasonal picks";

function getSeasonHeadingFromSanity(
  season: Season,
  content?: LandingPageContent,
): string | undefined {
  if (!content) return undefined;
  // Sanity field naming: spring/summer/winter use the season name directly,
  // but "fall" maps to "Autumn" in the schema (matches editorial usage).
  if (season === "fall") return content.seasonalSpotlightAutumnHeading;
  const key = `seasonalSpotlight${season.charAt(0).toUpperCase() + season.slice(1)}Heading` as
    | "seasonalSpotlightSpringHeading"
    | "seasonalSpotlightSummerHeading"
    | "seasonalSpotlightWinterHeading";
  return content[key];
}

export type SpotlightCopy = {
  heading: string;
  description: string;
  ctaText: string;
};

/**
 * Resolves the spotlight section's copy from three sources, in order of
 * precedence. An *active* SeasonalHighlight wins so the homepage stays
 * date-honest (e.g. May 4 → "Late-Blooming Sakura" instead of a stale
 * peak-bloom claim). When no highlight is active, the per-season Sanity
 * override is the editorial kill switch; the static map is the final
 * fallback so the section never renders empty copy.
 */
export function resolveSpotlightCopy(
  highlight: SeasonalHighlight | null,
  season: Season,
  content?: LandingPageContent,
): SpotlightCopy {
  if (highlight) {
    return {
      heading: highlight.label,
      description: highlight.description,
      ctaText:
        HIGHLIGHT_CTA_TEXT[highlight.id] ??
        content?.seasonalSpotlightCtaText ??
        DEFAULT_CTA,
    };
  }

  return {
    heading: getSeasonHeadingFromSanity(season, content) ?? SEASON_HEADINGS[season],
    description: content?.seasonalSpotlightDescription ?? DEFAULT_DESCRIPTION,
    ctaText: content?.seasonalSpotlightCtaText ?? DEFAULT_CTA,
  };
}
