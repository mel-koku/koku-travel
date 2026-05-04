import { defineType, defineField } from "sanity";
import {
  EDITORIAL_PROSE_BLOCK,
  maxWordsValidator,
  noEmDashes,
  noEmDashesInPortableText,
} from "./_validators";

/**
 * City prose modules — Smart Guidebook content layer (Stage 4 of SG plan).
 * Supplies `character`, `howToRead`, `whenToCome`, and four practical
 * anchors. Not in scope for pre-launch (master roadmap defers Stages 3-4-4.5
 * to post-launch), but the schema lands in Stage 0 substrate so the LLM
 * pipeline has a draft target from day one.
 *
 * Read path falls back to `cityData.ts` for `tagline` and `description`
 * permanently per SG plan §"Page rendering — fallback discipline". A city
 * without a published `cityPage` renders the existing short paragraph.
 */
export const cityPage = defineType({
  name: "cityPage",
  title: "City Page",
  type: "document",
  fields: [
    defineField({
      name: "slug",
      title: "City Slug",
      type: "slug",
      description:
        'Must match a value in `KnownCityId` (e.g. "kyoto", "tokyo", "kanazawa"). Validated against `src/types/trip.ts` at read time.',
      options: { source: "title", maxLength: 60 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      title: "Display Title",
      type: "string",
      description: 'Human-readable city name, e.g. "Kyoto"',
      validation: (rule) => rule.required().max(60).custom(noEmDashes),
    }),
    defineField({
      name: "tagline",
      title: "Tagline (override)",
      type: "string",
      description:
        "Optional override for the `cityData.ts` tagline. Leave blank to keep the existing static tagline.",
      validation: (rule) => rule.max(120).custom(noEmDashes),
    }),
    defineField({
      name: "character",
      title: "Character",
      type: "array",
      description:
        "Sensory character of the city. ≤100 words. Voice anchor: cityCharacterExample.",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(100)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "howToRead",
      title: "How To Read",
      type: "array",
      description:
        "Geographic / temporal logic specific to this city. Hints neighborhoods inline. ≤100 words.",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(100)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "whenToCome",
      title: "When To Come",
      type: "array",
      description:
        "Seasonal density + festival calendar + timing recommendations. ≤100 words. Festival data extracted deterministically by `festivalExtractor.ts` and injected into the prompt.",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(100)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "gettingThere",
      title: "Getting There",
      type: "array",
      description:
        "Airport / Shinkansen station / time from major hubs / JR Pass eligibility. ≤80 words.",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(80)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "whereToStay",
      title: "Where To Stay",
      type: "array",
      description:
        "2-3 neighborhood recommendations with reasoning (first-timer base / second-trip / budget). ≤100 words.",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(100)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "whatToSkip",
      title: "What To Skip (hand-written only)",
      type: "array",
      description:
        "Conditional skips only, three modes: duplicate-experience / timing-fix / genuine-skip. NEVER LLM-drafted — voice rubric in SG plan locked decision #4. ≤80 words.",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(80)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "howLongToSpend",
      title: "How Long To Spend",
      type: "array",
      description:
        'Typical 1-3 day frame, "minimum viable" framing. ≤60 words.',
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(60)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "featuredLocations",
      title: "Featured Locations",
      type: "array",
      description:
        "Location slugs (e.g. 'fushimi-inari-shrine-kyoto-...'). Validated against locations.id at read time via isValidLocationId().",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "neighborhoods",
      title: "Neighborhoods",
      type: "array",
      description:
        "Linked neighborhood pages. Only published `neighborhoodPage` docs render in the city's neighborhoods grid.",
      of: [{ type: "reference", to: [{ type: "neighborhoodPage" }] }],
    }),
    defineField({
      name: "flaggedClaims",
      title: "Flagged Claims (Pass 3 review)",
      type: "array",
      description:
        "Auto-populated by Pass 3 critique. Each flagged substring is rendered as a yellow-underline marker in Studio. Editor publishes only after every flag is dismissed or the prose is rewritten.",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
  ],
  preview: {
    select: { title: "title", slug: "slug.current" },
    prepare({ title, slug }) {
      return {
        title: title || slug || "Untitled city",
        subtitle: slug ? `City Page · ${slug}` : "City Page",
      };
    },
  },
});
