/**
 * Shared validators for Smart Guidebook schemas (cityPage, regionPage,
 * neighborhoodPage, editorNote, voiceAnchors). Authored 2026-05-04 alongside
 * the content-layer pipeline; safe for use in other schemas, but existing
 * doc types (culturalPillar, guide, experience) intentionally inline their
 * em-dash checks to avoid a churn diff.
 */

const EM_DASH_PATTERN = /--|—/;

export function noEmDashes(val: unknown): true | string {
  if (typeof val === "string" && EM_DASH_PATTERN.test(val))
    return 'Remove em-dashes ("--" or "—"). Use a period or two sentences instead.';
  return true;
}

/**
 * Walks a Portable Text block array and returns total word count across all
 * span children. Treats non-PT shapes as 0 words rather than throwing — Sanity
 * passes `undefined` during initial form mounts and we don't want a phantom
 * validation error.
 */
export function countPortableTextWords(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  let count = 0;
  for (const block of value) {
    if (
      block &&
      typeof block === "object" &&
      "children" in block &&
      Array.isArray((block as { children: unknown }).children)
    ) {
      for (const child of (block as { children: unknown[] }).children) {
        if (
          child &&
          typeof child === "object" &&
          "text" in child &&
          typeof (child as { text: unknown }).text === "string"
        ) {
          const words = (child as { text: string }).text
            .trim()
            .split(/\s+/)
            .filter(Boolean);
          count += words.length;
        }
      }
    }
  }
  return count;
}

/**
 * Validation factory: caps a PT field at `max` words. Pairs with
 * `noEmDashesInPortableText` for editorial-prose fields.
 */
export function maxWordsValidator(max: number) {
  return (value: unknown): true | string => {
    const count = countPortableTextWords(value);
    if (count > max) return `Too long: ${count} words (max ${max}).`;
    return true;
  };
}

/**
 * Walks a PT block array and rejects em-dashes anywhere in span text.
 * Use on PT prose fields written by humans; LLM-drafted prose is also gated
 * at runtime via `scanForDenyListViolations` in
 * src/lib/server/contentGen/denyList.ts.
 */
export function noEmDashesInPortableText(value: unknown): true | string {
  if (!Array.isArray(value)) return true;
  for (const block of value) {
    if (
      block &&
      typeof block === "object" &&
      "children" in block &&
      Array.isArray((block as { children: unknown }).children)
    ) {
      for (const child of (block as { children: unknown[] }).children) {
        if (
          child &&
          typeof child === "object" &&
          "text" in child &&
          typeof (child as { text: unknown }).text === "string"
        ) {
          if (EM_DASH_PATTERN.test((child as { text: string }).text))
            return 'Remove em-dashes ("--" or "—"). Use a period or two sentences instead.';
        }
      }
    }
  }
  return true;
}

/**
 * Standard editorial-prose block-style config. Smart Guidebook prose fields
 * are simple paragraphs only — no headings, no embeds, no images. Decorators
 * limited to bold/italic/em.
 */
export const EDITORIAL_PROSE_BLOCK = {
  type: "block" as const,
  styles: [{ title: "Normal", value: "normal" }],
  lists: [],
  marks: {
    decorators: [
      { title: "Italic", value: "em" },
      { title: "Bold", value: "strong" },
    ],
    annotations: [],
  },
};
