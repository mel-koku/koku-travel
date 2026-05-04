import { defineType, defineField } from "sanity";
import {
  EDITORIAL_PROSE_BLOCK,
  maxWordsValidator,
  noEmDashes,
  noEmDashesInPortableText,
} from "./_validators";

/**
 * Voice anchor singleton — the single biggest voice-quality lever in the
 * Smart Guidebook content layer.
 *
 * Hand-written exemplars at every prose tier are loaded as few-shot examples
 * into every LLM call (region prose, city prose, neighborhood prose, editor
 * notes, practical anchors). Without them, voice drifts.
 *
 * Per SG plan v3 lock: 11 exemplars across three registers.
 *  - Region: Kansai / Hokkaido / Tokyo
 *  - City: Kyoto / Kanazawa / Tokyo
 *  - Neighborhood: Gion / Asakusa
 *  - Editor notes: one Kyoto temple + one Tokyo restaurant
 *  - Full Kyoto practical-anchor set (gettingThere, whereToStay, whatToSkip,
 *    howLongToSpend, gateway examples)
 *
 * Per SG plan v4: drafts authored by Claude on `voice-anchors-draft` branch
 * 2026-04-30; mel + team must edit substantively before lock to break the
 * circular-calibration risk (LLM-authored anchors calibrate the LLM to its
 * own defaults).
 *
 * Singleton: only one document of this type should exist. Studio enforcement
 * is via deskStructure config (not enforced at schema level — keeping the
 * type itself plain so Sanity doesn't reject the doc).
 */
export const voiceAnchors = defineType({
  name: "voiceAnchors",
  title: "Voice Anchors (singleton)",
  type: "document",
  fields: [
    // ── Region tier (3 registers) ─────────────────────────────────────────
    defineField({
      name: "regionExampleKansai",
      title: "Region Example — Kansai (~200w)",
      type: "array",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(220)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "regionExampleHokkaido",
      title: "Region Example — Hokkaido (~200w)",
      type: "array",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(220)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "regionExampleTokyo",
      title: "Region Example — Greater Tokyo (~200w)",
      type: "array",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(220)).custom(noEmDashesInPortableText),
    }),
    // ── City tier (3 registers) ───────────────────────────────────────────
    defineField({
      name: "cityCharacterExampleKyoto",
      title: "City Character — Kyoto (~80w)",
      type: "array",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(100)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "cityCharacterExampleKanazawa",
      title: "City Character — Kanazawa (~80w)",
      type: "array",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(100)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "cityCharacterExampleTokyo",
      title: "City Character — Tokyo (~80w)",
      type: "array",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(100)).custom(noEmDashesInPortableText),
    }),
    // ── Neighborhood tier (2 registers) ───────────────────────────────────
    defineField({
      name: "neighborhoodExampleGion",
      title: "Neighborhood — Gion (~80w)",
      type: "array",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(100)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "neighborhoodExampleAsakusa",
      title: "Neighborhood — Asakusa (~80w)",
      type: "array",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(100)).custom(noEmDashesInPortableText),
    }),
    // ── Editor notes (2 registers) ────────────────────────────────────────
    defineField({
      name: "editorNoteExampleTemple",
      title: "Editor Note — Kyoto Temple (~30w)",
      type: "array",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(60)).custom(noEmDashesInPortableText),
    }),
    defineField({
      name: "editorNoteExampleRestaurant",
      title: "Editor Note — Tokyo Restaurant (~30w)",
      type: "array",
      of: [EDITORIAL_PROSE_BLOCK],
      validation: (rule) =>
        rule.custom(maxWordsValidator(60)).custom(noEmDashesInPortableText),
    }),
    // ── Practical anchors (Kyoto full set) ────────────────────────────────
    defineField({
      name: "practicalAnchorExamples",
      title: "Practical Anchors — Kyoto",
      type: "object",
      description:
        "One example per practical-anchor field. Together these calibrate the model on the full anchor register.",
      fields: [
        defineField({
          name: "gettingThere",
          title: "Getting There (~60w)",
          type: "array",
          of: [EDITORIAL_PROSE_BLOCK],
          validation: (rule) =>
            rule
              .custom(maxWordsValidator(80))
              .custom(noEmDashesInPortableText),
        }),
        defineField({
          name: "whereToStay",
          title: "Where To Stay (~80w)",
          type: "array",
          of: [EDITORIAL_PROSE_BLOCK],
          validation: (rule) =>
            rule
              .custom(maxWordsValidator(100))
              .custom(noEmDashesInPortableText),
        }),
        defineField({
          name: "whatToSkip",
          title: "What To Skip (~60w, hand-written register)",
          type: "array",
          of: [EDITORIAL_PROSE_BLOCK],
          validation: (rule) =>
            rule
              .custom(maxWordsValidator(80))
              .custom(noEmDashesInPortableText),
        }),
        defineField({
          name: "howLongToSpend",
          title: "How Long To Spend (~50w)",
          type: "array",
          of: [EDITORIAL_PROSE_BLOCK],
          validation: (rule) =>
            rule
              .custom(maxWordsValidator(60))
              .custom(noEmDashesInPortableText),
        }),
        defineField({
          name: "gateway",
          title: "Gateway (~60w)",
          type: "array",
          of: [EDITORIAL_PROSE_BLOCK],
          validation: (rule) =>
            rule
              .custom(maxWordsValidator(80))
              .custom(noEmDashesInPortableText),
        }),
      ],
    }),
    defineField({
      name: "lockedAt",
      title: "Locked At",
      type: "datetime",
      description:
        "Set when mel + team finalize the edit pass. The pipeline reads this to confirm anchors are no longer drafts. Empty = drafts only, do not run authoring at scale.",
    }),
    defineField({
      name: "notes",
      title: "Editorial Notes",
      type: "text",
      rows: 3,
      description:
        "Free-form notes for future-mel: what we changed during the edit pass, what calibration risks we caught, what to revisit next iteration.",
      validation: (rule) => rule.custom(noEmDashes),
    }),
  ],
  preview: {
    select: { lockedAt: "lockedAt" },
    prepare({ lockedAt }) {
      return {
        title: "Voice Anchors",
        subtitle: lockedAt
          ? `Locked ${new Date(lockedAt).toISOString().slice(0, 10)}`
          : "Drafts (not yet locked)",
      };
    },
  },
});
