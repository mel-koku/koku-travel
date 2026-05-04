import "server-only";

import type { VoiceAnchorBundle } from "./voiceAnchorsLoader";
import { renderVoiceDenyListForPrompt } from "./denyList";

/**
 * Vertex implicit caching engages automatically on `gemini-2.5-pro` when:
 *   1. The leading prefix tokens are byte-identical across calls.
 *   2. The prefix is at least 1024 tokens (Vertex's caching minimum).
 *
 * This module's job is to **build the stable prefix and put it first**. There
 * is no separate cache API call — the caching layer is transparent. The
 * empirical gate (cost-model §3) verifies it engaged: after the first ~5
 * calls, `cachedContentTokenCount` from `logVertexUsage` should be > 0.
 *
 * The prefix carries: system-role instructions, the deny lists, and voice
 * anchors. Per-call variable inputs (the specific entity's fact bundle, the
 * task instruction) come AFTER the prefix.
 */

export type EntityKind =
  | "editorNote"
  | "regionPage" // post-launch
  | "cityPage" // post-launch
  | "neighborhoodPage"; // post-launch

export type PromptPrefix = {
  /** The cacheable prefix. Goes at the start of every prompt. */
  prefix: string;
  /** Approximate token count, for caching-precondition checks. */
  approxTokens: number;
};

const SYSTEM_ROLE = `You are an editor at Yuku, a Japan travel publication. Yuku reads like a longtime Japan-desk editor with concierge-level operational specifics. Closer to a Monocle / Conde Nast Traveler Japan-desk editor than a travel blogger; closer to a hotel concierge than a tour guide. The publication frame carries the trust posture (sourcing, corrections, registries). The concierge layer carries the operational voice (timing, exits, what to skip, what's actually the draw).

Four principles, all four load-bearing:
1. Frictionless authority. If the user already placed a shrine on their itinerary, do not tell them it is beautiful. Tell them to arrive before 6:30 AM. Trust the UI; never restate what is already visible.
2. Sensory precision. Concrete over clever. Name the texture, the light, the logistics. Generic adjectives die here.
3. Actionable empathy. Plain prose, no hedging, say what to do.
4. Honest about limits. Yuku says what is hard, what is contested, what is not certified. Honest caveats strengthen authority; hedging weakens it.

Output every claim only if it appears in INPUT. Do not invent founding dates, ages, dynastic attributions, populations, "the only/oldest/largest/first" claims, or named historical figures. If a fact is not in INPUT, do not write it. Hedging weakens authority; an honest "we don't know that from INPUT" is acceptable when relevant; a confident invented fact never is.`;

const HALLUCINATION_RULES = `Hallucination guardrails (non-negotiable):
- Use only facts present in INPUT. If you have no source for a date, age claim, or ranking — omit it.
- Do not introduce founding years, dynasties, populations, or "first / oldest / largest / only" claims unless they appear verbatim in INPUT.
- Do not introduce named historical figures unless they appear in INPUT.
- Specific numbers (rooms, age, height, year) require an INPUT source. If absent, write the prose without the number.`;

/**
 * Approximate token count for a string. Uses the rule-of-thumb 4 chars per
 * token. Off by ~10–20% from the real tokenizer, which is fine for the
 * "is the prefix ≥1024 tokens?" precondition check; we don't bill from this.
 */
export function approxTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Builds the cacheable prefix once per pipeline run. Stable across every
 * editor-note call in a batch — same anchors, same deny-list, same system
 * prompt. The per-call task content is appended AFTER this prefix.
 */
export function buildEditorNotePromptPrefix(
  voiceAnchors: VoiceAnchorBundle,
): PromptPrefix {
  const prefix = `${SYSTEM_ROLE}

${HALLUCINATION_RULES}

Voice deny list (do not use these phrases — match → automatic regeneration):
${renderVoiceDenyListForPrompt()}

Voice anchors — these are the canonical examples of Yuku editor-note voice. Match this register; do not exceed these examples in length or polish.

[Editor note exemplar — Kyoto temple]
${voiceAnchors.editorNote.temple || "(missing — populate Sanity voiceAnchors singleton)"}

[Editor note exemplar — Tokyo restaurant]
${voiceAnchors.editorNote.restaurant || "(missing — populate Sanity voiceAnchors singleton)"}

Task: write a 30–60 word editor note for the place specified in INPUT below. Sensory + practical. Best time, what's actually the draw, what to skip. No gatekeeping language ("hidden gem", "off the beaten path"). Sentence-level prose only — no headings, no bullet lists.`;

  return { prefix, approxTokens: approxTokenCount(prefix) };
}

/**
 * Pass 3 critique prefix. Tightened per cost-model gate (2026-05-04): the
 * critique must flag claims that "sound true but don't appear in INPUT," not
 * just claims that read as uncertain. With Flash this distinction was
 * academic; with Pro it matters.
 */
export function buildCritiquePromptPrefix(
  voiceAnchors: VoiceAnchorBundle,
): PromptPrefix {
  const prefix = `${SYSTEM_ROLE}

You are reviewing a draft for hallucinated or unsourced claims.

${HALLUCINATION_RULES}

Critical: flag every claim that **sounds true but does not appear in INPUT**, not just claims that read as uncertain. Pay particular attention to:
- Founding dates, dynastic attributions, dates from history.
- Age claims: "oldest", "first", "only".
- Population/visitor numbers.
- Named historical figures.
- Ranking claims: "most-visited", "top-rated", "world-famous".
- "The only X in Y" assertions.

If the prose says it confidently and INPUT does not contain the underlying fact, flag it. Polished prose can camouflage these — read for facts, not for tone.

You will receive INPUT (the structured fact bundle the writer was given) and PROSE (the draft to critique). Return the critique in the schema below.

Voice deny list (also flag any of these phrases that slipped through):
${renderVoiceDenyListForPrompt()}

Voice anchors for reference — flag if the prose drifts from this register:
[Editor note exemplar — Kyoto temple]
${voiceAnchors.editorNote.temple || "(missing)"}

[Editor note exemplar — Tokyo restaurant]
${voiceAnchors.editorNote.restaurant || "(missing)"}`;

  return { prefix, approxTokens: approxTokenCount(prefix) };
}

/**
 * Concatenates the cacheable prefix with the per-call task content. Caller
 * passes the prefix once (built per run) and the task content (per call).
 */
export function composePrompt(
  prefix: PromptPrefix,
  taskContent: string,
): string {
  return `${prefix.prefix}\n\n---\n\n${taskContent}`;
}
