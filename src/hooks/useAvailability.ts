import { useQuery } from "@tanstack/react-query";
import type { AvailableDate, AvailableInterpreter } from "@/lib/people/availabilityService";
import { fetchWithTimeout } from "@/lib/utils/fetchWithTimeout";

type PersonAvailabilityResponse = {
  slug: string;
  month: string;
  availableDates: AvailableDate[];
};

type ExperienceInterpretersResponse = {
  slug: string;
  date: string;
  interpreters: AvailableInterpreter[];
};

export function usePersonAvailability(slug: string | null, month: string | null) {
  return useQuery<PersonAvailabilityResponse>({
    queryKey: ["person-availability", slug, month],
    enabled: !!slug && !!month,
    queryFn: async ({ signal }) => {
      const res = await fetchWithTimeout(`/api/people/${slug}/availability?month=${month}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch availability");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useExperienceInterpreters(
  experienceSlug: string | null,
  date: string | null
) {
  return useQuery<ExperienceInterpretersResponse>({
    queryKey: ["experience-interpreters", experienceSlug, date],
    enabled: !!experienceSlug && !!date,
    queryFn: async ({ signal }) => {
      const res = await fetchWithTimeout(`/api/availability/experience?slug=${experienceSlug}&date=${date}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch interpreters");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
