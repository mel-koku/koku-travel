import { defineType, defineField } from "sanity";
import {
  EDITORIAL_PROSE_BLOCK,
  maxWordsValidator,
  noEmDashesInPortableText,
} from "./_validators";

/**
 * Per-place editor notes — Smart Guidebook Stage 5 (top 150 places at launch).
 * Sensory + practical micro-essays, 30-60 words each.
 *
 * Read path: queried in the location detail loader by `location_slug`,
 * cached via `contentService.ts` two-tier cache. Surfaces on PlaceDetail (as
 * a pull-quote callout) and on itinerary stops with an editor note (same
 * pull-quote treatment). Not rendered on LocationCard — would crowd the card.
 *
 * Eng review note (locked decision): editor notes live ONLY in Sanity, NOT
 * on the `locations` table. Single source of truth.
 */
export const editorNote = defineType({
  name: "editorNote",
  title: "Editor Note",
  type: "document",
  fields: [
    defineField({
      name: "locationSlug",
      title: "Location Slug",
      type: "string",
      description:
        "Foreign key to `locations.id` (slug-style). Validated at read time via isValidLocationId().",
      validation: (rule) =>
        rule
          .required()
          .max(255)
          .custom((val) => {
            if (typeof val !== "string") return "Required.";
            if (!/^[A-Za-z0-9._-]+$/.test(val))
              return "Slug must be alphanumeric with hyphens, underscores, or dots only.";
            return true;
          }),
    }),
    defineField({
      name: "note",
      title: "Editor Note",
      type: "array",
      description:
        "Sensory + practical: best time, what's actually the draw, what to skip. 30-60 words. Voice anchor: editorNoteExample.",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(60)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "flaggedClaims",
      title: "Flagged Claims (Pass 3 review)",
      type: "array",
      description:
        "Auto-populated by Pass 3 critique. Yellow-underline markers in Studio. Editor publishes only after every flag is dismissed or the prose is rewritten.",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
  ],
  preview: {
    select: { slug: "locationSlug" },
    prepare({ slug }) {
      return {
        title: slug || "Unassigned editor note",
        subtitle: "Editor Note",
      };
    },
  },
});
