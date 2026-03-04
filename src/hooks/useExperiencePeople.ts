"use client";

import { useEffect, useState } from "react";
import type { ExperiencePerson } from "@/types/person";

/**
 * Fetches people linked to a location/experience.
 * Tries sanitySlug first, falls back to locationId.
 * Returns empty array when neither is provided or no people found.
 */
export function useExperiencePeople(
  sanitySlug: string | undefined,
  locationId?: string
) {
  const [people, setPeople] = useState<ExperiencePerson[]>([]);

  useEffect(() => {
    if (!sanitySlug && !locationId) {
      setPeople([]);
      return;
    }

    let cancelled = false;

    const params = new URLSearchParams();
    if (sanitySlug) params.set("slug", sanitySlug);
    if (locationId) params.set("locationId", locationId);

    fetch(`/api/people/by-experience?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && Array.isArray(json.data)) {
          setPeople(json.data);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [sanitySlug, locationId]);

  return people;
}
