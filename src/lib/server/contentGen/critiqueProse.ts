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
 * Critical mandate (cost-model gate, 2026-05-04): flag claims that **sound
 * true but don't appear in INPUT**, not just claims that read as uncertain.
 * Pro's polished prose camouflages plausible-but-wrong facts that Flash's
 * stiffer output would expose; this pass is the load-bearing backstop
 * before the prose lands in mel's review queue as a Sanity draft.
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
    "Return every substring in PROSE that makes a factual claim not present in INPUT. Quote substrings exactly so the Studio marker can render them. Be conservative: if a phrase makes no factual claim (purely sensory/atmospheric), do not flag it. If it asserts a year, ranking, age, identity, or 'the only/oldest/first' status that isn't sourced — flag it.",
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
