import { useQuery } from "@tanstack/react-query";
import type { AvailableDate, AvailableInterpreter } from "@/lib/people/availabilityService";

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
    queryFn: async () => {
      const res = await fetch(`/api/people/${slug}/availability?month=${month}`);
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
    queryFn: async () => {
      const res = await fetch(`/api/availability/experience?slug=${experienceSlug}&date=${date}`);
      if (!res.ok) throw new Error("Failed to fetch interpreters");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
