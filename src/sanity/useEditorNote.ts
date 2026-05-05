"use client";

import { useEffect, useState } from "react";
import type { PortableTextBlock } from "@portabletext/react";
import { sanityClient } from "./client";
import { EDITOR_NOTE_QUERY } from "./editorNote";

/**
 * Client-side React hook for fetching a Smart Guidebook editor note.
 * Refetches when `slug` changes; returns:
 *   - undefined while loading
 *   - null when no note exists
 *   - the `note` PortableText blocks when found
 *
 * Used by the LocationExpanded drawer. The detail page uses the server-side
 * `fetchEditorNoteByLocationSlug` helper instead and passes the result down
 * as a prop.
 */
export function useEditorNoteByLocationSlug(
  slug: string | undefined,
): PortableTextBlock[] | null | undefined {
  const [state, setState] = useState<PortableTextBlock[] | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState(undefined);
    sanityClient
      .fetch<{ note?: PortableTextBlock[] } | null>(EDITOR_NOTE_QUERY, { slug })
      .then((result) => {
        if (cancelled) return;
        setState(result?.note ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setState(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}
