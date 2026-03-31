import { createClient } from "@/lib/supabase/server";
import type {
  ExperiencePerson,
  Person,
  PersonType,
  PersonWithExperiences,
} from "@/types/person";
import { logger } from "@/lib/logger";

/** Explicit projection matching Person type */
const PERSON_COLUMNS = "id, type, name, name_japanese, slug, bio, photo_url, city, prefecture, region, languages, specialties, years_experience, license_number, website_url, social_links, guide_count, is_published, sanity_slug, created_at, updated_at";

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
    .select(PERSON_COLUMNS)
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !data) return null;
  return data as Person;
}

/**
 * Fetch all published people, optionally filtered by type.
 * Handles Supabase 1000-row limit with pagination.
 */
export async function getPublishedPeople(
  type?: PersonType
): Promise<Person[]> {
  const supabase = await createClient();
  const PAGE_SIZE = 1000;
  const allPeople: Person[] = [];
  let page = 0;

  while (true) {
    let query = supabase
      .from("people")
      .select(PERSON_COLUMNS)
      .eq("is_published", true)
      .order("name", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;
    if (error) {
      logger.error("Failed to fetch published people", error);
      break;
    }
    if (!data || data.length === 0) break;
    allPeople.push(...(data as Person[]));
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  return allPeople;
}

/**
 * Fetch a person by slug with their linked experiences.
 */
export async function getPersonWithExperiences(
  slug: string
): Promise<PersonWithExperiences | null> {
  const supabase = await createClient();

  const { data: person, error } = await supabase
    .from("people")
    .select(PERSON_COLUMNS)
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !person) return null;

  const { data: links } = await supabase
    .from("people_experiences")
    .select("experience_slug, role, is_primary")
    .eq("person_id", person.id);

  return {
    ...(person as Person),
    experiences: (links ?? []).map((l) => ({
      slug: l.experience_slug,
      role: l.role,
      is_primary: l.is_primary ?? true,
    })),
  };
}

/**
 * Create a booking inquiry. Returns the new row ID, or null on failure.
 */
export async function createBookingInquiry(data: {
  personId: string;
  userId: string;
  contactEmail: string;
  preferredDatesStart?: string;
  preferredDatesEnd?: string;
  groupSize?: number;
  message?: string;
}): Promise<{ id: string } | null> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("booking_inquiries")
    .insert({
      person_id: data.personId,
      user_id: data.userId,
      contact_email: data.contactEmail,
      preferred_dates_start: data.preferredDatesStart ?? null,
      preferred_dates_end: data.preferredDatesEnd ?? null,
      group_size: data.groupSize ?? null,
      message: data.message ?? null,
    })
    .select("id")
    .single();

  if (error) {
    logger.error("Failed to create booking inquiry", error);
    return null;
  }

  return { id: row.id };
}
