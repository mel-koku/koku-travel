import { useQuery } from "@tanstack/react-query";
import type { Person, PersonWithExperiences } from "@/types/person";

async function fetchAllPeople(): Promise<{
  data: Person[];
  total: number;
}> {
  const res = await fetch("/api/people/all");
  if (!res.ok) throw new Error("Failed to fetch people");
  return res.json();
}

async function fetchPersonDetail(
  slug: string
): Promise<{ data: PersonWithExperiences }> {
  const res = await fetch(`/api/people/${slug}`);
  if (!res.ok) throw new Error("Failed to fetch person detail");
  return res.json();
}

export function useAllPeople() {
  return useQuery({
    queryKey: ["people", "all"],
    queryFn: fetchAllPeople,
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function usePersonDetail(slug: string | null) {
  return useQuery({
    queryKey: ["people", "detail", slug],
    queryFn: () => fetchPersonDetail(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });
}
