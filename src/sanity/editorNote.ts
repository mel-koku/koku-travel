import type { PortableTextBlock } from "@portabletext/react";
import { sanityClient } from "./client";

/**
 * Editor note (Smart Guidebook content layer) — server-side lookup.
 *
 * Editor notes are short curated paragraphs (~30–60 words) keyed to
 * `locations.id` (slug) via the `locationSlug` field on the `editorNote`
 * Sanity document.
 *
 * Coverage at launch (2026-05-05): 400 of ~5,460 active locations have a
 * note; the rest fall back to the existing description.
 *
 * The schema only allows simple paragraph blocks (no headings, embeds, or
 * images) — see `src/sanity/schemas/editorNote.ts`.
 *
 * For client-side fetches (the drawer), use `useEditorNoteByLocationSlug`
 * from `./useEditorNote` — kept in a separate module so this file is safe
 * to import from server components.
 */

export const EDITOR_NOTE_QUERY = `*[_type == "editorNote" && locationSlug == $slug][0]{ note }`;

/**
 * Server-side fetch. Use in page loaders (`generateMetadata`, server
 * components). Returns null when no note exists or the Sanity client is in
 * placeholder mode (no env vars).
 */
export async function fetchEditorNoteByLocationSlug(
  slug: string,
): Promise<PortableTextBlock[] | null> {
  if (!slug) return null;
  try {
    const result = await sanityClient.fetch<{ note?: PortableTextBlock[] } | null>(
      EDITOR_NOTE_QUERY,
      { slug },
    );
    return result?.note ?? null;
  } catch {
    // Sanity unreachable / placeholder env / network error — caller already
    // degrades to description, so swallow rather than throw.
    return null;
  }
}
