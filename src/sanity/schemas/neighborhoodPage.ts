import { defineType, defineField } from "sanity";
import {
  EDITORIAL_PROSE_BLOCK,
  maxWordsValidator,
  noEmDashes,
  noEmDashesInPortableText,
} from "./_validators";

/**
 * Neighborhood prose modules — Smart Guidebook Stage 4.5 (deferred to
 * post-launch). 9 cities at v1: Tokyo, Kyoto, Osaka, Kanazawa, Sapporo,
 * Sendai, Hiroshima, Nara, Fukuoka. ~50-100 neighborhood pages total.
 *
 * Sanity-or-nothing: route at `/cities/[slug]/neighborhoods/[neighborhood-slug]/page.tsx`
 * is net-new and only renders for neighborhoods with a published
 * `neighborhoodPage`. The parent city's grid only links neighborhoods that
 * exist.
 *
 * Selection rule for neighborhood-grade containers: `parent_mode IN ('container',
 * 'flexible')` AND `≥4 active children` AND `planning_city` set AND a
 * meaningful name. Container-detection script is a separate Stage 0
 * deliverable; mel reviews and rejects any that aren't neighborhood-grade.
 */
export const neighborhoodPage = defineType({
  name: "neighborhoodPage",
  title: "Neighborhood Page",
  type: "document",
  fields: [
    defineField({
      name: "slug",
      title: "Neighborhood Slug",
      type: "slug",
      description:
        'Per-neighborhood slug, used in URL: `/cities/[city]/neighborhoods/[slug]`. Lowercase, kebab-case (e.g. "gion", "arashiyama").',
      options: { source: "title", maxLength: 60 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      title: "Display Title",
      type: "string",
      description: 'Human-readable name, e.g. "Gion".',
      validation: (rule) => rule.required().max(60).custom(noEmDashes),
    }),
    defineField({
      name: "parentCitySlug",
      title: "Parent City Slug",
      type: "string",
      description: 'Must match a `KnownCityId` (e.g. "kyoto").',
      validation: (rule) => rule.required().max(60).custom(noEmDashes),
    }),
    defineField({
      name: "parentContainerId",
      title: "Parent Container Location ID",
      type: "string",
      description:
        "Foreign key to `locations.id` (slug-style, e.g. 'gion-historic-district-kyoto-...'). Anchors this neighborhood to its DB container row. Validated at read time via isValidLocationId().",
      validation: (rule) => rule.required().max(255),
    }),
    defineField({
      name: "character",
      title: "Character",
      type: "array",
      description:
        "What the neighborhood feels like; how it differs from its neighbors. ≤100 words. Voice anchor: neighborhoodExample.",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(100)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "practicalEntry",
      title: "Practical Entry",
      type: "array",
      description:
        "How to arrive (specific station/exit), where to start the walk, ideal time of day. ≤60 words.",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(60)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "featuredLocations",
      title: "Featured Locations",
      type: "array",
      description:
        "4-8 location slugs (the container's best children, by composite score).",
      of: [{ type: "string" }],
      options: { layout: "tags" },
      validation: (rule) => rule.min(4).max(8),
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
    select: {
      title: "title",
      city: "parentCitySlug",
      slug: "slug.current",
    },
    prepare({ title, city, slug }) {
      return {
        title: title || slug || "Untitled neighborhood",
        subtitle: city ? `${city} · neighborhood` : "Neighborhood Page",
      };
    },
  },
});
