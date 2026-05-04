import "server-only";

import { sanityClient } from "@/sanity/client";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";

/**
 * Loads the `voiceAnchors` singleton from Sanity and returns it as plain
 * Portable-Text-rendered strings ready to inject into LLM prompts.
 *
 * Per SG plan v3 lock: 11 exemplars across three registers. Per v4: drafts
 * authored by Claude on `voice-anchors-draft` branch 2026-04-30; mel + team
 * must edit substantively before lock to break circular calibration. The
 * `lockedAt` field is the gate — if absent, the pipeline refuses to run at
 * scale (smoke-test runs are still allowed via `allowDrafts`).
 */

export type VoiceAnchorBundle = {
  region: {
    kansai: string;
    hokkaido: string;
    tokyo: string;
  };
  cityCharacter: {
    kyoto: string;
    kanazawa: string;
    tokyo: string;
  };
  neighborhood: {
    gion: string;
    asakusa: string;
  };
  editorNote: {
    temple: string;
    restaurant: string;
  };
  practicalAnchors: {
    gettingThere: string;
    whereToStay: string;
    whatToSkip: string;
    howLongToSpend: string;
    gateway: string;
  };
  /**
   * ISO timestamp set when mel + team finalize the edit pass. Empty/null =
   * drafts only — the pipeline refuses to run at scale.
   */
  lockedAt: string | null;
};

/** Raw shape returned by the Sanity GROQ query. PT arrays + strings. */
type RawVoiceAnchorsDoc = {
  regionExampleKansai?: unknown;
  regionExampleHokkaido?: unknown;
  regionExampleTokyo?: unknown;
  cityCharacterExampleKyoto?: unknown;
  cityCharacterExampleKanazawa?: unknown;
  cityCharacterExampleTokyo?: unknown;
  neighborhoodExampleGion?: unknown;
  neighborhoodExampleAsakusa?: unknown;
  editorNoteExampleTemple?: unknown;
  editorNoteExampleRestaurant?: unknown;
  practicalAnchorExamples?: {
    gettingThere?: unknown;
    whereToStay?: unknown;
    whatToSkip?: unknown;
    howLongToSpend?: unknown;
    gateway?: unknown;
  } | null;
  lockedAt?: string | null;
};

/** Extracts plain text from a Portable Text block array, joining paragraphs
 *  with double newlines. Empty/missing input → empty string. */
export function portableTextToPlain(value: unknown): string {
  if (!Array.isArray(value)) return "";
  const paragraphs: string[] = [];
  for (const block of value) {
    if (
      block &&
      typeof block === "object" &&
      "children" in block &&
      Array.isArray((block as { children: unknown }).children)
    ) {
      const text = (block as { children: unknown[] }).children
        .map((child) => {
          if (
            child &&
            typeof child === "object" &&
            "text" in child &&
            typeof (child as { text: unknown }).text === "string"
          ) {
            return (child as { text: string }).text;
          }
          return "";
        })
        .join("");
      if (text.trim()) paragraphs.push(text);
    }
  }
  return paragraphs.join("\n\n");
}

const VOICE_ANCHORS_QUERY = `*[_type == "voiceAnchors"][0]{
  regionExampleKansai,
  regionExampleHokkaido,
  regionExampleTokyo,
  cityCharacterExampleKyoto,
  cityCharacterExampleKanazawa,
  cityCharacterExampleTokyo,
  neighborhoodExampleGion,
  neighborhoodExampleAsakusa,
  editorNoteExampleTemple,
  editorNoteExampleRestaurant,
  practicalAnchorExamples,
  lockedAt
}`;

/**
 * Fetches voice anchors from Sanity and returns the typed bundle. Throws on
 * network failure — content authoring batches must not silently proceed
 * without anchors. The pipeline calls `assertReadyForBatch` after this to
 * gate on `lockedAt`.
 */
export async function loadVoiceAnchors(): Promise<VoiceAnchorBundle> {
  let raw: RawVoiceAnchorsDoc | null;
  try {
    raw = await sanityClient.fetch<RawVoiceAnchorsDoc | null>(
      VOICE_ANCHORS_QUERY,
    );
  } catch (err) {
    logger.error(
      "loadVoiceAnchors: Sanity fetch failed",
      err instanceof Error ? err : new Error(getErrorMessage(err)),
    );
    throw new Error(
      "Voice anchors fetch failed; cannot run content authoring without anchors.",
    );
  }

  if (!raw) {
    throw new Error(
      "Voice anchors singleton is missing in Sanity. Populate the `voiceAnchors` doc before running the authoring pipeline.",
    );
  }

  return {
    region: {
      kansai: portableTextToPlain(raw.regionExampleKansai),
      hokkaido: portableTextToPlain(raw.regionExampleHokkaido),
      tokyo: portableTextToPlain(raw.regionExampleTokyo),
    },
    cityCharacter: {
      kyoto: portableTextToPlain(raw.cityCharacterExampleKyoto),
      kanazawa: portableTextToPlain(raw.cityCharacterExampleKanazawa),
      tokyo: portableTextToPlain(raw.cityCharacterExampleTokyo),
    },
    neighborhood: {
      gion: portableTextToPlain(raw.neighborhoodExampleGion),
      asakusa: portableTextToPlain(raw.neighborhoodExampleAsakusa),
    },
    editorNote: {
      temple: portableTextToPlain(raw.editorNoteExampleTemple),
      restaurant: portableTextToPlain(raw.editorNoteExampleRestaurant),
    },
    practicalAnchors: {
      gettingThere: portableTextToPlain(
        raw.practicalAnchorExamples?.gettingThere,
      ),
      whereToStay: portableTextToPlain(
        raw.practicalAnchorExamples?.whereToStay,
      ),
      whatToSkip: portableTextToPlain(raw.practicalAnchorExamples?.whatToSkip),
      howLongToSpend: portableTextToPlain(
        raw.practicalAnchorExamples?.howLongToSpend,
      ),
      gateway: portableTextToPlain(raw.practicalAnchorExamples?.gateway),
    },
    lockedAt: raw.lockedAt ?? null,
  };
}

/**
 * Gates a production batch run on the `lockedAt` field. Raises a clear error
 * if the anchors are still drafts. Smoke-test runs can opt out via
 * `allowDrafts: true` when running a single test entity for prompt iteration.
 */
export function assertReadyForBatch(
  bundle: VoiceAnchorBundle,
  opts?: { allowDrafts?: boolean },
): void {
  if (opts?.allowDrafts) return;
  if (!bundle.lockedAt) {
    throw new Error(
      "Voice anchors are still drafts (lockedAt is empty). " +
        "Lock the singleton in Sanity Studio before running batch authoring, " +
        "or pass { allowDrafts: true } for smoke-test runs.",
    );
  }
}

/**
 * Returns the appropriate exemplar for a given entity type + sub-tier.
 * Stable selection — used by the prompt-cache prefix builder so the prefix
 * stays identical across calls (a precondition for Vertex implicit caching).
 */
export function selectAnchorForEditorNote(
  bundle: VoiceAnchorBundle,
  kind: "temple" | "restaurant" | "auto",
  hint?: { categoryParent?: string },
): string {
  if (kind === "temple") return bundle.editorNote.temple;
  if (kind === "restaurant") return bundle.editorNote.restaurant;
  // auto: route by hint
  if (hint?.categoryParent === "food") return bundle.editorNote.restaurant;
  return bundle.editorNote.temple;
}
