import type { Location, DietaryFlag } from "@/types/location";
import { DIETARY_FLAG_VALUES } from "@/types/location";

export type DietaryPill = {
  label: "Halal" | "Vegan friendly" | "Gluten-free" | "Vegetarian friendly";
  flag: DietaryFlag;
  tone: "neutral";
};

// Higher index = lower priority. Priority: halal > vegan > gluten_free > vegetarian.
const PRIORITY: readonly DietaryFlag[] = [
  "halal",
  "vegan",
  "gluten_free",
  "vegetarian",
];

// Label mapping. The inconsistency between bare "Halal" / "Gluten-free" and the
// hedged "Vegan friendly" / "Vegetarian friendly" is intentional:
// - Halal is a certification-style claim; hedging weakens it and may mislead.
// - Gluten-free is tight because "friendly" wouldn't add safety for celiacs.
// - Vegetarian/Vegan are hedged because Japanese cuisine often uses dashi
//   (fish stock) in "vegetarian" dishes — the suffix encodes actual confidence.
// Do not "fix" this to be uniform without reading the spec.
const LABEL: Record<DietaryFlag, DietaryPill["label"]> = {
  halal: "Halal",
  vegan: "Vegan friendly",
  gluten_free: "Gluten-free",
  vegetarian: "Vegetarian friendly",
};

const GATED_CATEGORIES = new Set(["restaurant", "cafe", "bar"]);

function isKnownFlag(value: string): value is DietaryFlag {
  return (DIETARY_FLAG_VALUES as readonly string[]).includes(value);
}

/**
 * Derives up to 2 dietary pills for a location.
 * Returns [] when the category is not food-related, when no flags apply, or when
 * only unknown values are present. Never throws.
 *
 * Rules:
 *  - Only restaurants, cafes, and bars render pills (other categories → []).
 *  - Start from location.dietaryFlags (filtered to known DIETARY_FLAG_VALUES).
 *  - If 'vegetarian' is absent AND location.dietaryOptions.servesVegetarianFood === true,
 *    add 'vegetarian' as a Google-sourced backstop (no-op if already present).
 *  - If 'vegan' is present, drop 'vegetarian' (vegan subsumes vegetarian).
 *  - Sort by PRIORITY, cap at 2, map to DietaryPill[].
 */
export function deriveDietaryPills(location: Location): DietaryPill[] {
  if (!GATED_CATEGORIES.has(location.category)) return [];

  const editorial = (location.dietaryFlags ?? []).filter(isKnownFlag);
  const set = new Set<DietaryFlag>(editorial);

  // Google backstop — only for vegetarian.
  if (
    !set.has("vegetarian") &&
    location.dietaryOptions?.servesVegetarianFood === true
  ) {
    set.add("vegetarian");
  }

  // Subsumption: vegan implies vegetarian; showing both is redundant.
  if (set.has("vegan")) set.delete("vegetarian");

  if (set.size === 0) return [];

  const sorted = PRIORITY.filter((flag) => set.has(flag));
  return sorted.slice(0, 2).map((flag) => ({
    label: LABEL[flag],
    flag,
    tone: "neutral" as const,
  }));
}
