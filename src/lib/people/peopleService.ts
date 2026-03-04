import { createClient } from "@/lib/supabase/server";
import type { ExperiencePerson, Person } from "@/types/person";

/**
 * Fetch people linked to an experience by its Sanity slug.
 * Returns people joined with their role, ordered primary-first.
 */
export async function getPeopleByExperienceSlug(
  slug: string
): Promise<ExperiencePerson[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("people_experiences")
    .select(
      `
      role,
      is_primary,
      person:people!inner(*)
      `
    )
    .eq("experience_slug", slug)
    .eq("person.is_published", true)
    .order("is_primary", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((row) => row.person != null)
    .map((row) => {
      const person = row.person as unknown as Person;
      return {
        ...person,
        role: row.role as ExperiencePerson["role"],
        is_primary: row.is_primary ?? true,
      };
    });
}

/**
 * Fetch people linked to a location by its Supabase ID.
 * Used for craft locations that don't have a Sanity experience slug.
 */
export async function getPeopleByLocationId(
  locationId: string
): Promise<ExperiencePerson[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("people_experiences")
    .select(
      `
      role,
      is_primary,
      person:people!inner(*)
      `
    )
    .eq("location_id", locationId)
    .eq("person.is_published", true)
    .order("is_primary", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((row) => row.person != null)
    .map((row) => {
      const person = row.person as unknown as Person;
      return {
        ...person,
        role: row.role as ExperiencePerson["role"],
        is_primary: row.is_primary ?? true,
      };
    });
}

/** Fetch a single person by slug (for future profile pages). */
export async function getPersonBySlug(
  slug: string
): Promise<Person | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !data) return null;
  return data as Person;
}
