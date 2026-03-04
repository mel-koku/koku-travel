import { useMemo, useState, useCallback } from "react";
import type { Person, PersonType } from "@/types/person";

export type PeopleSortOption = "recommended" | "experience" | "name";

/** "aizu-wakamatsu" → "Aizu-Wakamatsu" */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

type PeopleFiltersState = {
  query: string;
  type: PersonType | null;
  city: string | null;
  language: string | null;
  sort: PeopleSortOption;
};

const INITIAL: PeopleFiltersState = {
  query: "",
  type: null,
  city: null,
  language: null,
  sort: "recommended",
};

export function usePeopleFilters(people: Person[] | undefined) {
  const [filters, setFilters] = useState<PeopleFiltersState>(INITIAL);

  const setQuery = useCallback(
    (q: string) => setFilters((p) => ({ ...p, query: q })),
    []
  );
  const setType = useCallback(
    (t: PersonType | null) => setFilters((p) => ({ ...p, type: t })),
    []
  );
  const setCity = useCallback(
    (c: string | null) => setFilters((p) => ({ ...p, city: c })),
    []
  );
  const setLanguage = useCallback(
    (l: string | null) => setFilters((p) => ({ ...p, language: l })),
    []
  );
  const setSort = useCallback(
    (s: PeopleSortOption) => setFilters((p) => ({ ...p, sort: s })),
    []
  );
  const clearAll = useCallback(() => setFilters(INITIAL), []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.city) count++;
    if (filters.language) count++;
    // type and query are not counted as "refine" filters
    return count;
  }, [filters.city, filters.language]);

  // Derive unique cities (title-cased, with counts) and languages
  const { cities, cityCountMap } = useMemo(() => {
    if (!people) return { cities: [] as string[], cityCountMap: {} as Record<string, number> };
    const counts: Record<string, number> = {};
    for (const p of people) {
      if (p.city) {
        const normalized = titleCase(p.city.trim());
        counts[normalized] = (counts[normalized] ?? 0) + 1;
      }
    }
    // Sort by count desc, then alphabetically
    const sorted = Object.keys(counts).sort((a, b) => counts[b]! - counts[a]! || a.localeCompare(b));
    return { cities: sorted, cityCountMap: counts };
  }, [people]);

  const languages = useMemo(() => {
    if (!people) return [];
    const set = new Set<string>();
    for (const p of people) {
      for (const l of p.languages) set.add(l);
    }
    return [...set].sort();
  }, [people]);

  // Type counts for tabs
  const typeCounts = useMemo(() => {
    if (!people)
      return { artisan: 0, guide: 0, host: 0, interpreter: 0, author: 0 };
    const counts: Record<string, number> = { artisan: 0, guide: 0, host: 0, interpreter: 0, author: 0 };
    for (const p of people) {
      if (p.type in counts) counts[p.type] = (counts[p.type] ?? 0) + 1;
    }
    return counts;
  }, [people]);

  const filteredPeople = useMemo(() => {
    if (!people) return [];
    let result = people;

    if (filters.type) {
      result = result.filter((p) => p.type === filters.type);
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.specialties.some((s) => s.toLowerCase().includes(q)) ||
          (p.city && p.city.toLowerCase().includes(q))
      );
    }
    if (filters.city) {
      const cityLower = filters.city.toLowerCase();
      result = result.filter((p) => p.city?.toLowerCase() === cityLower);
    }
    if (filters.language) {
      result = result.filter((p) => p.languages.includes(filters.language!));
    }

    // Sort
    if (filters.sort === "experience") {
      result = [...result].sort(
        (a, b) => (b.years_experience ?? 0) - (a.years_experience ?? 0)
      );
    } else if (filters.sort === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }
    // "recommended" = default order (alphabetical from API)

    return result;
  }, [people, filters]);

  return {
    filters,
    filteredPeople,
    cities,
    cityCountMap,
    languages,
    typeCounts,
    activeFilterCount,
    setQuery,
    setType,
    setCity,
    setLanguage,
    setSort,
    clearAll,
  };
}
