import "server-only";

/**
 * Smart Guidebook content-layer deny list.
 *
 * Two layers, both load-bearing:
 *
 * 1. **Voice deny-list** — overlaps with the existing user-facing prose
 *    deny-list in `guideProseGenerator.ts`. Kept here as a separate, slightly
 *    extended copy so content-authoring prompts can reference an authoritative
 *    list without coupling to the user-facing pipeline. (The Pro-on-authoring
 *    / Flash-on-hot-path boundary means the two pipelines should not share
 *    runtime state.)
 *
 * 2. **Hallucination deny-list** — patterns that flag confidently-wrong
 *    factual claims regardless of voice. Per cost-model gate (2026-05-04),
 *    these matter more under Pro because Pro's polished prose camouflages
 *    plausible-but-wrong facts that Flash's stiffer output would expose.
 *
 * Match → automatic regeneration in the orchestrator (D7). The Pass 3
 * critique (D6) also flags anything that *sounds true but isn't in INPUT*
 * even when it doesn't trip a regex; the deny list is the surface backstop,
 * not the only check.
 */

/**
 * Voice patterns. Banned because they're either (a) generic AI filler,
 * (b) gatekeeping / hype-coded, or (c) breaks the brand voice rule on
 * em-dashes (project-wide policy: en-dashes for numeric ranges fine; em-dashes
 * never in user-facing copy).
 */
export const VOICE_DENY_LIST: RegExp[] = [
  /--|—/, // em-dashes
  /\bamazing\b/i,
  /\bincredible\b/i,
  /\bunforgettable\b/i,
  /\bbustling\b/i,
  /\bvibrant\b/i,
  /\bhidden gem\b/i,
  /\bdelve\b/i,
  /\bimmerse\b/i,
  /\bsoak in\b/i,
  /\bmust-see\b/i,
  /\bcan't-miss\b/i,
  /\btucked away\b/i,
  /\boff the beaten path\b/i,
  /\btreasure\b/i,
  /\bembark\b/i,
  /\bventure\b/i,
  /\bfeast for the senses\b/i,
  /\btreat yourself\b/i,
  /\bdon't miss\b/i,
  /\bexperience of a lifetime\b/i,
  /\bbucket list\b/i,
  /\bget ready\b/i,
  /\byou'll love\b/i,
  /\bexplore\b/i,
  /\bdiscover\b/i,
  /\bwander\b/i,
  /\bauthentic\b/i,
  /\bgem\b/i,
  /\bstunning\b/i,
  /\bbreathtaking\b/i,
  /\bjourney\b/i,
  /\bnestled\b/i,
  /\bbest-kept secret\b/i,
  /\btapestry\b/i,
  /\brich tapestry\b/i,
  /\btraditional\b/i, // generic-filler usage; specific dish/practice names are fine in INPUT
  /\bhub\b/i,
  /\babsolutely\b/i,
  /\btruly\b/i,
  /\breally\b/i, // intensifier
  // Soft sensory adjectives — replace with concrete nouns per brand voice.
  // Empirically observed slipping past Pass 3 in 2026-05-04 smoke tests.
  /\batmospheric\b/i,
  /\btranquil\b/i,
  /\bserene\b/i,
  /\bscenic\b/i,
  /\bcharming\b/i,
  // Food-blog clichés that aren't factual claims (so Pass 3's
  // factual-claim-only check misses them) but read as AI-default.
  /\bfall(s|ing)?[- ]off[- ]the[- ]bone\b/i,
  /\bmelt(s|ing)?[- ]in[- ]your[- ]mouth\b/i,
];

/**
 * Hallucination-shaped patterns. These flag claims the LLM tends to
 * confabulate when prompted on Japan travel: founding dates, dynastic
 * attributions, dating-back-to phrasing, and unsupported "the X-est" claims.
 *
 * If INPUT does contain a verbatim factual claim with one of these shapes
 * (e.g. a Wikidata snippet says "founded in 794"), the LLM should be allowed
 * to use it. The Pass 3 critique (D6) carries the "compare against INPUT"
 * judgment; this list trips a regen on Pass 2 output before the critique
 * runs, since fixing voice + halluc together is cheaper than two passes.
 *
 * Tradeoff acknowledged: a small number of false-positive regens when the
 * INPUT genuinely contained a date. Cost is one extra Vertex call (cents).
 * Tolerable. The alternative — letting plausible-but-wrong claims slip past
 * surface checks and land on mel's review queue — is the more expensive
 * failure mode.
 */
export const HALLUCINATION_DENY_LIST: RegExp[] = [
  /\b\d{3,4}\s*(AD|BC|CE|BCE)\b/i, // "794 AD", "300 BC"
  /\b\d{1,2}(st|nd|rd|th)\s*century\b/i, // "8th century"
  /\bfounded in\b/i,
  /\bdating back to\b/i,
  /\bestablished in (the\s+)?\d{3,4}\b/i, // "established in 1603"
  /\bbuilt in (the\s+)?\d{3,4}\b/i, // "built in 1397"
  /\bthe oldest\b/i,
  /\bthe largest\b/i,
  /\bthe first\b/i,
  /\bthe only\b/i,
  /\bthe most[ -](visited|popular|famous)\b/i,
  /\bworld[ -]famous\b/i,
];

/**
 * Combined list — every regen-trigger pattern. Use this for the standard
 * post-generation scan; use the individual lists when the call site needs
 * to distinguish voice from halluc (e.g. logging metrics separately).
 */
export const CONTENT_AUTHORING_DENY_LIST: RegExp[] = [
  ...VOICE_DENY_LIST,
  ...HALLUCINATION_DENY_LIST,
];

/**
 * Returns the first matched substring across all patterns, or null. The
 * orchestrator reads this and either regenerates (Pass 2) or flags via
 * Pass 3 (`flaggedClaims[]`) depending on whether retries remain.
 */
export function findFirstDenyListViolation(text: string): string | null {
  for (const pattern of CONTENT_AUTHORING_DENY_LIST) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

/**
 * Returns every matched substring (deduped) across all patterns. Useful for
 * Pass-3-output flagging where multiple spans need yellow-underline markers.
 */
export function findAllDenyListViolations(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of CONTENT_AUTHORING_DENY_LIST) {
    const matches = text.match(new RegExp(pattern.source, "gi"));
    if (matches) for (const m of matches) found.add(m);
  }
  return [...found];
}

/**
 * Renders the voice deny list as a prompt-ready bullet block. Used by the
 * Pass 2 / Pass 3 system prompts; kept as a function (not a constant) so the
 * prompt-cache layer (D3) can observe whether the prefix is stable across
 * calls.
 */
export function renderVoiceDenyListForPrompt(): string {
  const phrases = VOICE_DENY_LIST.map((re) =>
    re.source
      .replace(/^\\b|\\b$/g, "")
      .replace(/\\b/g, "")
      .replace(/\(\?:.+?\)/g, (m) => m)
      .replace(/[()]/g, ""),
  );
  return phrases.map((p) => `- ${p}`).join("\n");
}
