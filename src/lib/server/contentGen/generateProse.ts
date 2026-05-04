import "server-only";

import { z } from "zod";
import { logger } from "@/lib/logger";
import { callContentVertex } from "./_callContentVertex";
import { composePrompt, type PromptPrefix } from "./promptCache";
import {
  type EditorNoteFactBundle,
  renderFactBundleForPrompt,
} from "./extractFacts";
import { findFirstDenyListViolation } from "./denyList";
import type { AuthoringBudget } from "./authoringBudget";

/**
 * Pass 2 — prose generation.
 *
 * Editor notes only at launch (Stages 0–2 scope). Region / city / neighborhood
 * generators will live alongside this; the shared shape is "fact bundle in,
 * prose + dirty flag out".
 *
 * Deny-list policy: the orchestrator (D7) calls Pass 2 with a retry budget.
 * Pass 2 returns `{ prose, denyListViolation }` so the caller decides
 * whether to retry, halt, or pass through to Pass 3 (which flags rather
 * than rejects). At most one retry per entity to keep cost bounded.
 */

const editorNoteOutputSchema = z.object({
  prose: z
    .string()
    .min(1)
    .describe(
      "30-60 word editor note. Sensory + practical. Sentence-level prose only — no headings, no bullet lists.",
    ),
});

export type ProseGenerationResult = {
  prose: string;
  /** First deny-list match found in the prose, if any. Null = clean. */
  denyListViolation: string | null;
  /** Approximate word count of the returned prose. */
  wordCount: number;
};

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Builds the per-call task content for an editor note. The cacheable prefix
 * is supplied separately (built once per run) — this returns just the
 * variable tail.
 */
function buildEditorNoteTaskContent(
  facts: EditorNoteFactBundle,
  isRetry: boolean,
  prevViolation?: string,
): string {
  const lines: string[] = [];
  lines.push("INPUT:");
  lines.push(renderFactBundleForPrompt(facts));
  if (isRetry && prevViolation) {
    lines.push("");
    lines.push(
      `Your previous draft used the banned phrase: "${prevViolation}". Rewrite. Do not use that phrase or any synonym.`,
    );
  }
  lines.push("");
  lines.push(
    "Write the editor note now. 30–60 words. Use only facts in INPUT. Return JSON: { prose }.",
  );
  return lines.join("\n");
}

/**
 * Generates one editor note. Single LLM call. Caller (D7) retries on
 * deny-list violation; Pass 3 (D6) is responsible for hallucination flagging.
 */
export async function generateEditorNoteProse(opts: {
  facts: EditorNoteFactBundle;
  prefix: PromptPrefix;
  budget: AuthoringBudget;
  isRetry?: boolean;
  prevViolation?: string;
  abortSignal?: AbortSignal;
}): Promise<ProseGenerationResult> {
  const taskContent = buildEditorNoteTaskContent(
    opts.facts,
    opts.isRetry ?? false,
    opts.prevViolation,
  );
  const prompt = composePrompt(opts.prefix, taskContent);

  const { prose } = await callContentVertex({
    prompt,
    schema: editorNoteOutputSchema,
    source: opts.isRetry ? "editorNote-pass2-retry" : "editorNote-pass2",
    budget: opts.budget,
    abortSignal: opts.abortSignal,
  });

  const violation = findFirstDenyListViolation(prose);
  const wordCount = countWords(prose);

  if (wordCount < 20 || wordCount > 80) {
    // Out of band — the schema can't hard-cap word count, so log and let the
    // caller decide whether to regen or accept.
    logger.warn("editor note word count out of expected band", {
      locationId: opts.facts.locationId,
      wordCount,
    });
  }

  return { prose, denyListViolation: violation, wordCount };
}
