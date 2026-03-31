import { createClient } from "@/lib/supabase/server";
import { parseLocalDate } from "@/lib/utils/dateUtils";

export type AvailableDate = {
  date: string; // YYYY-MM-DD
  morning: boolean;
  afternoon: boolean;
};

export type AvailableInterpreter = {
  id: string;
  name: string;
  city: string | null;
  languages: string[];
  morning: boolean;
  afternoon: boolean;
};

/**
 * Returns available dates for a person in a given month.
 * Applies weekly rules + specific-date overrides (blackouts).
 */
export async function getPersonAvailability(
  personId: string,
  year: number,
  month: number // 1-based
): Promise<AvailableDate[]> {
  const supabase = await createClient();

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("day_of_week, specific_date, morning_available, afternoon_available, is_available")
    .eq("person_id", personId);

  if (!rules || rules.length === 0) return [];

  const weeklyRules = new Map<number, { morning: boolean; afternoon: boolean }>();
  const specificRules = new Map<string, { morning: boolean; afternoon: boolean; available: boolean }>();

  for (const r of rules) {
    if (r.day_of_week !== null) {
      weeklyRules.set(r.day_of_week, {
        morning: r.morning_available,
        afternoon: r.afternoon_available,
      });
    } else if (r.specific_date) {
      specificRules.set(r.specific_date, {
        morning: r.morning_available,
        afternoon: r.afternoon_available,
        available: r.is_available,
      });
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const available: AvailableDate[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dateStr = date.toISOString().slice(0, 10);
    const dow = date.getDay();

    const specific = specificRules.get(dateStr);
    if (specific) {
      if (specific.available) {
        available.push({ date: dateStr, morning: specific.morning, afternoon: specific.afternoon });
      }
      continue;
    }

    const weekly = weeklyRules.get(dow);
    if (weekly) {
      available.push({ date: dateStr, morning: weekly.morning, afternoon: weekly.afternoon });
    }
  }

  return available;
}

/**
 * Returns interpreters available for a given experience on a specific date.
 * Filters by: linked to experience slug (role=interpreter) + available that day.
 */
export async function getExperienceInterpreters(
  experienceSlug: string,
  date: string // YYYY-MM-DD
): Promise<AvailableInterpreter[]> {
  const supabase = await createClient();

  // Get interpreter person IDs linked to this experience
  const { data: links } = await supabase
    .from("people_experiences")
    .select("person_id")
    .eq("experience_slug", experienceSlug)
    .eq("role", "interpreter");

  if (!links || links.length === 0) return [];

  const personIds = links.map((l) => l.person_id);

  // Fetch interpreter profiles
  const { data: people } = await supabase
    .from("people")
    .select("id, name, city, languages")
    .in("id", personIds)
    .eq("is_published", true)
    .eq("type", "interpreter");

  if (!people || people.length === 0) return [];

  // Fetch availability rules for these interpreters
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("person_id, day_of_week, specific_date, morning_available, afternoon_available, is_available")
    .in("person_id", personIds);

  const dateObj = parseLocalDate(date)!;
  const dow = dateObj.getDay();

  // Build a lookup map: O(rules.length) once, then O(1) per person
  const rulesMap = new Map<string, typeof rules>();
  for (const rule of rules ?? []) {
    const existing = rulesMap.get(rule.person_id);
    if (existing) {
      existing.push(rule);
    } else {
      rulesMap.set(rule.person_id, [rule]);
    }
  }

  const result: AvailableInterpreter[] = [];

  for (const person of people) {
    const personRules = rulesMap.get(person.id) ?? [];

    // Check specific date override first
    const specific = personRules.find((r) => r.specific_date === date);
    if (specific) {
      if (specific.is_available) {
        result.push({ ...person, morning: specific.morning_available, afternoon: specific.afternoon_available });
      }
      continue;
    }

    // Fall back to weekly rule
    const weekly = personRules.find((r) => r.day_of_week === dow);
    if (weekly && weekly.is_available) {
      result.push({ ...person, morning: weekly.morning_available, afternoon: weekly.afternoon_available });
    }
  }

  return result;
}
