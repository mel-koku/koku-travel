import { defineType, defineField } from "sanity";
import {
  EDITORIAL_PROSE_BLOCK,
  maxWordsValidator,
  noEmDashes,
  noEmDashesInPortableText,
} from "./_validators";

/**
 * Region prose modules — Smart Guidebook content layer (Stage 3 of SG plan,
 * 9 regions). Deferred to post-launch by the master roadmap; schema lands in
 * Stage 0 substrate so the LLM pipeline has a draft target.
 *
 * Region pages are Sanity-or-nothing per SG plan §"Page rendering — fallback
 * discipline". Route `/regions/[slug]/page.tsx` doesn't exist yet; it stays
 * unlinked until all 9 regions are published.
 */
export const regionPage = defineType({
  name: "regionPage",
  title: "Region Page",
  type: "document",
  fields: [
    defineField({
      name: "slug",
      title: "Region Slug",
      type: "slug",
      description:
        'Must match a region ID (e.g. "kansai", "tohoku", "hokkaido", "kanto", "chubu", "chugoku", "shikoku", "kyushu", "okinawa").',
      options: { source: "title", maxLength: 30 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      title: "Display Title",
      type: "string",
      description: 'Human-readable region name, e.g. "Kansai"',
      validation: (rule) => rule.required().max(40).custom(noEmDashes),
    }),
    defineField({
      name: "character",
      title: "Character",
      type: "array",
      description:
        "Regional voice. ≤200 words. Voice anchor: regionExample.",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(200)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "geographicLogic",
      title: "Geographic Logic",
      type: "array",
      description:
        "How cities connect, transit logic, day-trip relationships. ≤150 words.",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(150)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "whenToCome",
      title: "When To Come",
      type: "array",
      description:
        "Seasonal density, festival calendar (extracted from DB), tourist load. ≤150 words.",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(150)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "gateway",
      title: "Gateway",
      type: "array",
      description:
        "Main airports, JR Pass logic, primary Shinkansen routes. ≤80 words.",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(80)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "bestBaseCities",
      title: "Best Base Cities",
      type: "array",
      description: "1-3 city slugs. Must-stay-in references.",
      of: [{ type: "string" }],
      options: { layout: "tags" },
      validation: (rule) => rule.max(3),
    }),
    defineField({
      name: "signatureCities",
      title: "Signature Cities",
      type: "array",
      description: "3-4 city slugs. Must-see references.",
      of: [{ type: "string" }],
      options: { layout: "tags" },
      validation: (rule) => rule.max(5),
    }),
    defineField({
      name: "routeSuggestions",
      title: "Route Suggestions",
      type: "array",
      description:
        '"If you have X days, here\'s the spine" — each suggestion is a structured object with day count + city sequence + dek.',
      of: [
        {
          type: "object",
          name: "routeSuggestion",
          fields: [
            defineField({
              name: "dayCount",
              title: "Day Count",
              type: "number",
              validation: (rule) => rule.required().min(1).max(30),
            }),
            defineField({
              name: "citySequence",
              title: "City Sequence",
              type: "array",
              description: "Ordered list of city slugs.",
              of: [{ type: "string" }],
              options: { layout: "tags" },
              validation: (rule) => rule.required().min(1),
            }),
            defineField({
              name: "dek",
              title: "Dek",
              type: "text",
              rows: 2,
              description: "Short framing for this route.",
              validation: (rule) =>
                rule.required().max(200).custom(noEmDashes),
            }),
          ],
          preview: {
            select: { dayCount: "dayCount", dek: "dek" },
            prepare({ dayCount, dek }) {
              return {
                title: `${dayCount} day${dayCount === 1 ? "" : "s"}`,
                subtitle: dek,
              };
            },
          },
        },
      ],
    }),
    defineField({
      name: "flaggedClaims",
      title: "Flagged Claims (Pass 3 review)",
      type: "array",
      description:
        "Auto-populated by Pass 3 critique. Yellow-underline markers in Studio.",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
  ],
  preview: {
    select: { title: "title", slug: "slug.current" },
    prepare({ title, slug }) {
      return {
        title: title || slug || "Untitled region",
        subtitle: slug ? `Region Page · ${slug}` : "Region Page",
      };
    },
  },
});
