import { useQuery } from "@tanstack/react-query";
import type { ExperienceSummary } from "@/types/experience";
import type { CraftTypeId } from "@/data/craftTypes";
import { fetchWithTimeout } from "@/lib/utils/fetchWithTimeout";

export function useWorkshopExperiences(craftType?: CraftTypeId | null) {
  return useQuery<ExperienceSummary[]>({
    queryKey: ["workshop-experiences", craftType ?? "all"],
    queryFn: async ({ signal }) => {
      const url = craftType
        ? `/api/experiences/workshops?type=${craftType}`
        : "/api/experiences/workshops";
      const res = await fetchWithTimeout(url, { signal });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });
}
