/**
 * Static category-based time estimates used as a fallback when a location's
 * curated `estimatedDuration` is empty. The dynamic version (sourced from
 * sub_experiences time_estimate aggregation) is a follow-up; this keeps the
 * fit-line populated on every card today.
 *
 * Returns undefined when category isn't recognized so callers can omit the
 * line entirely rather than render a guess.
 */

const STATIC_TIME_BY_CATEGORY: Record<string, string> = {
  // Culture
  shrine: "30–45 min",
  temple: "30–45 min",
  museum: "60–90 min",
  landmark: "30 min",
  castle: "60–90 min",
  historic_site: "45–60 min",
  theater: "90 min",
  performing_arts: "90 min",
  craft: "45–60 min",
  culture: "45–60 min",
  // Food
  restaurant: "60–90 min",
  cafe: "30–45 min",
  bar: "60–90 min",
  market: "45–60 min",
  // Nature
  park: "1–2 hrs",
  garden: "45–60 min",
  beach: "1–2 hrs",
  mountain: "Half day",
  onsen: "60–90 min",
  nature: "1–2 hrs",
  wellness: "60–90 min",
  // Shopping
  mall: "60–90 min",
  street: "45–60 min",
  specialty: "30–45 min",
  shopping: "45–60 min",
  // View
  viewpoint: "15–30 min",
  tower: "30–45 min",
  view: "15–30 min",
  // Entertainment
  entertainment: "90 min",
  aquarium: "90 min",
  zoo: "Half day",
};

export function getStaticTimeEstimate(category: string | null | undefined): string | undefined {
  if (!category) return undefined;
  return STATIC_TIME_BY_CATEGORY[category.toLowerCase()];
}

export function resolveTimeEstimate(
  estimatedDuration: string | null | undefined,
  category: string | null | undefined,
): string | undefined {
  const trimmed = estimatedDuration?.trim();
  if (trimmed) return trimmed;
  return getStaticTimeEstimate(category);
}

/**
 * Humanizes a sub-experience minute aggregate into a card-ready string.
 * Vocabulary intentionally matches the static fallback table above
 * ("Half day", "1 hr", "1.5 hrs") so dynamic and static labels read
 * consistently on the same grid.
 */
export function formatMinutesToFitLabel(minutes: number): string | undefined {
  if (!Number.isFinite(minutes) || minutes <= 0) return undefined;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes >= 480) return "Full day";
  if (minutes >= 240) return "Half day";

  // Round to nearest 0.5 hour for 60–239 min range.
  const halfHours = Math.round(minutes / 30);
  const hours = halfHours / 2;
  if (hours === 1) return "1 hr";
  return `${hours} hrs`;
}
