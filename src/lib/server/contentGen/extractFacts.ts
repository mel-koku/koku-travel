import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Pass 1 — deterministic fact extraction for the content authoring pipeline.
 *
 * **Editor notes (Stages 0–2 launch scope):** deterministic. Pulls a single
 * `locations` row + its sub_experiences + nearby travel_guidance tips and
 * shapes them into a typed `EditorNoteFactBundle`. No LLM call. The bundle
 * is what Pass 2 sees as INPUT, and what Pass 3 critiques against.
 *
 * **Region / city / neighborhood prose (post-launch):** structurally larger
 * inputs (10s–100s of locations), so distillation will become an LLM step.
 * Stubbed below; not in scope for the launch bar.
 */

export type EditorNoteFactBundle = {
  /** locations.id */
  locationId: string;
  name: string;
  nameJapanese: string | null;
  category: string | null;
  categoryParent: string | null;
  city: string | null;
  prefecture: string | null;
  rating: number | null;
  reviewCount: number | null;
  /** First 2-3 sentences of editorial_summary if present. */
  editorialSummary: string | null;
  /** Unconstrained free-text — what the place actually IS. */
  description: string | null;
  /** Compact opening-hours string if Google's structured data is available. */
  hoursSummary: string | null;
  /** Tags applied in DB. Useful for category-shaped sensory cues (e.g. quiet, busy). */
  tags: string[];
  /** Hand-curated insider tip from the locations row, if any. */
  insiderTip: string | null;
  /** Sub-experience summaries from the location's sub_experiences rows. */
  subExperiences: Array<{
    name: string;
    description: string | null;
    timeEstimate: string | null;
    tip: string | null;
  }>;
  /** Travel guidance tips that mention this location_id. */
  relatedTips: Array<{
    title: string;
    summary: string | null;
    guidanceType: string | null;
  }>;
};

type LocationRow = {
  id: string;
  name: string;
  name_japanese: string | null;
  category: string | null;
  city: string | null;
  prefecture: string | null;
  rating: number | null;
  review_count: number | null;
  editorial_summary: string | null;
  description: string | null;
  operating_hours: unknown;
  tags: string[] | null;
  insider_tip: string | null;
};

type SubExperienceRow = {
  name: string;
  description: string | null;
  time_estimate: string | null;
  tip: string | null;
};

type TipRow = {
  title: string;
  summary: string | null;
  guidance_type: string | null;
};

/** Lookup table: maps DB category enum values to one of the 6 parent groups
 *  used by the trip builder UI. Mirrors `DATABASE_CATEGORY_TO_PARENT` in
 *  src/data/categoryHierarchy.ts but kept local to avoid pulling client code
 *  into the server pipeline. Update when categoryHierarchy changes. */
const CATEGORY_TO_PARENT: Record<string, string> = {
  shrine: "culture",
  temple: "culture",
  museum: "culture",
  gallery: "culture",
  landmark: "culture",
  cultural: "culture",
  cafe: "food",
  restaurant: "food",
  bar: "food",
  market: "food",
  bakery: "food",
  food_specialty: "food",
  park: "nature",
  garden: "nature",
  nature: "nature",
  beach: "nature",
  mountain: "nature",
  shopping: "shopping",
  store: "shopping",
  district: "shopping",
  view: "view",
  observation: "view",
  entertainment: "entertainment",
  theater: "entertainment",
  arcade: "entertainment",
  onsen: "entertainment",
};

function summarizeOperatingHours(hours: unknown): string | null {
  // Google's operating_hours is `{ weekdayDescriptions: string[] }` or null.
  if (!hours || typeof hours !== "object") return null;
  const wd = (hours as { weekdayDescriptions?: unknown }).weekdayDescriptions;
  if (!Array.isArray(wd) || wd.length === 0) return null;
  // For an editor note, the LLM needs hours as a hint, not the full week.
  // Show 3 days max so the prompt stays compact.
  return wd
    .slice(0, 3)
    .filter((s) => typeof s === "string")
    .join(" / ");
}

/**
 * Builds the fact bundle for one editor note. Deterministic — three Supabase
 * queries (location, sub_experiences, travel_guidance), structured output.
 *
 * Throws if the location doesn't exist or isn't active. The orchestrator
 * catches and skips that slug, accumulating into a partial-batch summary.
 */
export async function extractEditorNoteFacts(
  client: SupabaseClient,
  locationId: string,
): Promise<EditorNoteFactBundle> {
  const { data: row, error } = await client
    .from("locations")
    .select(
      "id, name, name_japanese, category, city, prefecture, rating, review_count, editorial_summary, description, operating_hours, tags, insider_tip",
    )
    .eq("id", locationId)
    .eq("is_active", true)
    .maybeSingle();

  if (error)
    throw new Error(
      `extractEditorNoteFacts location query: ${error.message}`,
    );
  if (!row) throw new Error(`location not found or inactive: ${locationId}`);
  const location = row as LocationRow;

  const { data: subExpData, error: subErr } = await client
    .from("sub_experiences")
    .select("name, description, time_estimate, tip")
    .eq("location_id", locationId)
    .order("sort_order", { ascending: true })
    .limit(8);
  if (subErr)
    throw new Error(
      `extractEditorNoteFacts sub_experiences query: ${subErr.message}`,
    );

  const { data: tipsData, error: tipErr } = await client
    .from("travel_guidance")
    .select("title, summary, guidance_type")
    .contains("location_ids", [locationId])
    .eq("status", "published")
    .limit(5);
  if (tipErr)
    throw new Error(
      `extractEditorNoteFacts travel_guidance query: ${tipErr.message}`,
    );

  return {
    locationId: location.id,
    name: location.name,
    nameJapanese: location.name_japanese,
    category: location.category,
    categoryParent: location.category
      ? CATEGORY_TO_PARENT[location.category] ?? null
      : null,
    city: location.city,
    prefecture: location.prefecture,
    rating: location.rating,
    reviewCount: location.review_count,
    editorialSummary: location.editorial_summary,
    description: location.description,
    hoursSummary: summarizeOperatingHours(location.operating_hours),
    tags: Array.isArray(location.tags) ? location.tags : [],
    insiderTip: location.insider_tip,
    subExperiences: ((subExpData ?? []) as SubExperienceRow[]).map((s) => ({
      name: s.name,
      description: s.description,
      timeEstimate: s.time_estimate,
      tip: s.tip,
    })),
    relatedTips: ((tipsData ?? []) as TipRow[]).map((t) => ({
      title: t.title,
      summary: t.summary,
      guidanceType: t.guidance_type,
    })),
  };
}

/**
 * Renders a fact bundle as the INPUT block for Pass 2 / Pass 3 prompts.
 * Compact, prose-readable; the LLM treats this as the only source of truth.
 *
 * Format intentionally favors short labeled lines over JSON — Gemini handles
 * structured English better than nested JSON for this task size.
 */
export function renderFactBundleForPrompt(
  facts: EditorNoteFactBundle,
): string {
  const lines: string[] = [];
  lines.push(`Place: ${facts.name}`);
  if (facts.nameJapanese) lines.push(`Japanese: ${facts.nameJapanese}`);
  if (facts.category) lines.push(`Category: ${facts.category}`);
  if (facts.city || facts.prefecture)
    lines.push(
      `Location: ${[facts.city, facts.prefecture].filter(Boolean).join(", ")}`,
    );
  if (facts.rating !== null && facts.reviewCount !== null)
    lines.push(`Rating: ${facts.rating} (${facts.reviewCount} reviews)`);
  if (facts.editorialSummary)
    lines.push(`Editorial summary: ${facts.editorialSummary}`);
  if (facts.description) lines.push(`Description: ${facts.description}`);
  if (facts.hoursSummary) lines.push(`Hours: ${facts.hoursSummary}`);
  if (facts.tags.length) lines.push(`Tags: ${facts.tags.join(", ")}`);
  if (facts.insiderTip) lines.push(`Insider tip on file: ${facts.insiderTip}`);

  if (facts.subExperiences.length) {
    lines.push("");
    lines.push("Sub-experiences (specific things to do here):");
    for (const sx of facts.subExperiences) {
      const parts = [sx.name];
      if (sx.timeEstimate) parts.push(`(${sx.timeEstimate})`);
      if (sx.description) parts.push(`— ${sx.description}`);
      if (sx.tip) parts.push(`Tip: ${sx.tip}`);
      lines.push(`- ${parts.join(" ")}`);
    }
  }

  if (facts.relatedTips.length) {
    lines.push("");
    lines.push("Related travel guidance:");
    for (const t of facts.relatedTips) {
      lines.push(`- ${t.title}${t.summary ? `: ${t.summary}` : ""}`);
    }
  }

  return lines.join("\n");
}
