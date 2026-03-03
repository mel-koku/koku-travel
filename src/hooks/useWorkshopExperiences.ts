import { useQuery } from "@tanstack/react-query";
import type { ExperienceSummary } from "@/types/experience";
import type { CraftTypeId } from "@/data/craftTypes";

export function useWorkshopExperiences(craftType?: CraftTypeId | null) {
  return useQuery<ExperienceSummary[]>({
    queryKey: ["workshop-experiences", craftType ?? "all"],
    queryFn: async () => {
      const url = craftType
        ? `/api/experiences/workshops?type=${craftType}`
        : "/api/experiences/workshops";
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });
}
