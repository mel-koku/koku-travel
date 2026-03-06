import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { PricingRule, PriceBreakdown } from "@/types/person";

/**
 * Get the best matching pricing rule for a person + optional experience.
 * Priority: experience-specific > person default (experience_slug IS NULL).
 * Respects valid_from/valid_until date ranges.
 */
export async function getPricingRule(
  personId: string,
  experienceSlug?: string,
  date?: string // optional: filters by valid_from/valid_until
): Promise<PricingRule | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("person_id", personId)
    .order("experience_slug", { ascending: false, nullsFirst: false });

  if (error || !data || data.length === 0) {
    if (error) logger.error("Failed to fetch pricing rules", error);
    return null;
  }

  const today = date ?? new Date().toISOString().slice(0, 10);

  // Filter by date validity
  const valid = (data as PricingRule[]).filter((r) => {
    if (r.valid_from && today < r.valid_from) return false;
    if (r.valid_until && today > r.valid_until) return false;
    return true;
  });

  // Prefer experience-specific rule
  if (experienceSlug) {
    const match = valid.find((r) => r.experience_slug === experienceSlug);
    if (match) return match;
  }

  // Fall back to person default (no experience_slug)
  return valid.find((r) => r.experience_slug === null) ?? null;
}

/**
 * Calculate price breakdown for a booking.
 * Returns null if no pricing rule exists (treat as free / price on request).
 */
export async function calculatePrice(
  personId: string,
  groupSize: number,
  experienceSlug?: string,
  date?: string
): Promise<PriceBreakdown | null> {
  const rule = await getPricingRule(personId, experienceSlug, date);
  if (!rule) return null;

  return calculatePriceFromRule(rule, groupSize);
}

/**
 * Pure calculation from a pricing rule — no DB call.
 */
export function calculatePriceFromRule(
  rule: PricingRule,
  groupSize: number
): PriceBreakdown {
  const extraGuests = Math.max(0, groupSize - 1);
  const perPersonCost = rule.per_person_price ?? 0;
  const totalPrice = rule.base_price + extraGuests * perPersonCost;

  return {
    basePrice: rule.base_price,
    perPersonPrice: perPersonCost,
    extraGuests,
    totalPrice,
    currency: rule.currency,
    durationMinutes: rule.duration_minutes,
    maxGroup: rule.max_group,
  };
}

/**
 * Get all pricing rules for a person (for display on profile).
 */
export async function getPersonPricingRules(
  personId: string
): Promise<PricingRule[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("person_id", personId)
    .order("base_price", { ascending: true });

  if (error) {
    logger.error("Failed to fetch pricing rules", error);
    return [];
  }

  return (data ?? []) as PricingRule[];
}
