import "server-only";

import { z } from "zod";
import { callContentVertex } from "./_callContentVertex";
import { composePrompt, type PromptPrefix } from "./promptCache";
import {
  type EditorNoteFactBundle,
  renderFactBundleForPrompt,
} from "./extractFacts";
import { findAllDenyListViolations } from "./denyList";
import type { AuthoringBudget } from "./authoringBudget";

/**
 * Pass 3 — self-critique against the fact bundle.
 *
 * Single mandate (re-calibrated 2026-05-05 after the 400-batch experience):
 * flag substrings that assert a specific factual claim — number, named
 * feature, founding date, identity attribution, "the only/oldest/first/most-X"
 * status — not present in INPUT. Pro's polished prose camouflages
 * plausible-but-wrong specifics; Pass 3 is the backstop before mel's review.
 *
 * Voice / soft-adjective concerns are explicitly OUT of scope here — those
 * are handled at Pass 2 by the deny-list regen path (see denyList.ts). The
 * earlier two-flag-types prompt produced ~85% false positives on the
 * 400-batch (~63% of notes flagged, mostly stylistic noise); collapsing
 * Pass 3 to hallucination-only restores it as a useful gate.
 *
 * Output: the prose passes through verbatim (Pass 3 does NOT rewrite — it
 * flags), plus an array of substrings the editor should examine. Yellow-
 * underline Studio component (B2, separate Stage 0 deliverable) renders
 * each flagged substring with a popover.
 */

const critiqueOutputSchema = z.object({
  flaggedClaims: z
    .array(z.string().min(1))
    .describe(
      "Substrings in PROSE that make factual claims not present in INPUT. Each substring will be rendered as a yellow-underline marker in the Sanity Studio review surface. Empty array = prose is clean.",
    ),
  rationale: z
    .string()
    .describe(
      "One-sentence explanation of why each flag was raised, or 'Clean — every claim is sourced.' if none.",
    ),
});

export type CritiqueResult = {
  /** Pass-3 carries prose through unchanged; rewriting belongs to mel. */
  prose: string;
  /** Substrings in prose that need editor review. May include deny-list
   *  matches the LLM caught + halluc claims it caught. Deduped. */
  flaggedClaims: string[];
  rationale: string;
};

function buildEditorNoteCritiqueTaskContent(
  prose: string,
  facts: EditorNoteFactBundle,
): string {
  const lines: string[] = [];
  lines.push("INPUT (the facts the writer was given — the only allowed source for claims):");
  lines.push(renderFactBundleForPrompt(facts));
  lines.push("");
  lines.push("PROSE (the draft to critique):");
  lines.push(prose);
  lines.push("");
  lines.push(
    "Flag substrings in PROSE that assert a specific factual claim not present in INPUT. Quote each substring exactly so the Studio marker can render it.",
  );
  lines.push("");
  lines.push(
    "FLAG: substrings that assert a specific quantity (year, age, distance, duration, count, price, queue length, wait time), a specific identity (named feature, alternative branch, named dish, statue, ritual, festival, person), a specific status ('the only/oldest/first/most-X'), or a specific attribute (founding date, architect, material, dimension). Quantities and identities must literally appear in INPUT — different numbers, durations, or names are different claims, not paraphrases. Be strict: if the specific value is not in INPUT, flag it even if a generic version ('queues are common', 'the dish is famous') is.",
  );
  lines.push("");
  lines.push(
    "DO NOT FLAG: voice or stylistic concerns (soft adjectives like 'atmospheric', generic phrasing like 'main draw is') — those are handled separately. Do not flag operational guidance whose specifics literally appear in INPUT — e.g., 'arrive before 9 AM' is fine if INPUT's hours mention 9 AM; 'closed Mondays' is fine if INPUT's hours mention Monday closure.",
  );
  lines.push("");
  lines.push(
    "If PROSE is fully grounded in INPUT, return an empty flaggedClaims array.",
  );
  return lines.join("\n");
}

/**
 * Critiques one editor note. Single LLM call. Output is union'd with any
 * deny-list matches the orchestrator finds in surface text — the LLM may
 * miss surface phrasing matches the regex catches deterministically.
 */
export async function critiqueEditorNoteProse(opts: {
  prose: string;
  facts: EditorNoteFactBundle;
  prefix: PromptPrefix;
  budget: AuthoringBudget;
  abortSignal?: AbortSignal;
}): Promise<CritiqueResult> {
  const taskContent = buildEditorNoteCritiqueTaskContent(
    opts.prose,
    opts.facts,
  );
  const prompt = composePrompt(opts.prefix, taskContent);

  const { flaggedClaims, rationale } = await callContentVertex({
    prompt,
    schema: critiqueOutputSchema,
    source: "editorNote-pass3",
    budget: opts.budget,
    // 60s upper bound (default is 30s). Pro reasoning under the
    // hallucination-detection prompt occasionally exceeds the default, and
    // the cost is just a wait-cap on hangs. Keep at 60s after the 2026-05-05
    // re-calibration too — prompt is shorter, but Pro time isn't strictly
    // bounded by prompt size.
    timeoutMs: 60_000,
    abortSignal: opts.abortSignal,
  });

  // Union with regex-detected surface deny-list matches. The LLM may miss
  // these because it's calibrated to flag factual claims, not phrasing.
  // Dedupe via Set to avoid double-rendering yellow underlines.
  const regexMatches = findAllDenyListViolations(opts.prose);
  const merged = [...new Set([...flaggedClaims, ...regexMatches])];

  return {
    prose: opts.prose,
    flaggedClaims: merged,
    rationale,
  };
}
