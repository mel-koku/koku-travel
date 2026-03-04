import { useMemo, useState, useCallback } from "react";
import type { Person, PersonType } from "@/types/person";
import { getPrefectureForCity } from "@/data/prefectures";

export type PeopleSortOption = "recommended" | "experience" | "name";

/** "aizu-wakamatsu" → "Aizu-Wakamatsu" */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Resolve a person's city to a prefecture name. */
function resolvePrefecture(person: Person): string | undefined {
  // Try the person's prefecture field first
  if (person.prefecture) return titleCase(person.prefecture.trim());
  // Fall back to looking up city → prefecture
  if (person.city) return getPrefectureForCity(titleCase(person.city.trim()));
  return undefined;
}

type PeopleFiltersState = {
  query: string;
  type: PersonType | null;
  prefecture: string | null;
  language: string | null;
  sort: PeopleSortOption;
};

const INITIAL: PeopleFiltersState = {
  query: "",
  type: null,
  prefecture: null,
  language: null,
  sort: "recommended",
};

export function usePeopleFilters(people: Person[] | undefined) {
  const [filters, setFilters] = useState<PeopleFiltersState>(INITIAL);

  const setQuery = useCallback(
    (q: string) => setFilters((p) => ({ ...p, query: q })),
    [],
  );
  const setType = useCallback(
    (t: PersonType | null) => setFilters((p) => ({ ...p, type: t })),
    [],
  );
  const setPrefecture = useCallback(
    (pref: string | null) => setFilters((p) => ({ ...p, prefecture: pref })),
    [],
  );
  const setLanguage = useCallback(
    (l: string | null) => setFilters((p) => ({ ...p, language: l })),
    [],
  );
  const setSort = useCallback(
    (s: PeopleSortOption) => setFilters((p) => ({ ...p, sort: s })),
    [],
  );
  const clearAll = useCallback(() => setFilters(INITIAL), []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.prefecture) count++;
    if (filters.language) count++;
    return count;
  }, [filters.prefecture, filters.language]);

  // Build a person → prefecture lookup and unique prefectures list
  const { prefectures, personPrefectureMap } = useMemo(() => {
    if (!people)
      return {
        prefectures: [] as string[],
        personPrefectureMap: new Map<string, string>(),
      };

    const counts: Record<string, number> = {};
    const pmap = new Map<string, string>();

    for (const p of people) {
      const pref = resolvePrefecture(p);
      if (pref) {
        pmap.set(p.id, pref);
        counts[pref] = (counts[pref] ?? 0) + 1;
      }
    }

    const sorted = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    return { prefectures: sorted, personPrefectureMap: pmap };
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
    const counts: Record<string, number> = {
      artisan: 0,
      guide: 0,
      host: 0,
      interpreter: 0,
      author: 0,
    };
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
          (p.city && p.city.toLowerCase().includes(q)),
      );
    }
    if (filters.prefecture) {
      result = result.filter(
        (p) => personPrefectureMap.get(p.id) === filters.prefecture,
      );
    }
    if (filters.language) {
      result = result.filter((p) => p.languages.includes(filters.language!));
    }

    // Sort
    if (filters.sort === "experience") {
      result = [...result].sort(
        (a, b) => (b.years_experience ?? 0) - (a.years_experience ?? 0),
      );
    } else if (filters.sort === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [people, filters, personPrefectureMap]);

  return {
    filters,
    filteredPeople,
    prefectures,
    languages,
    typeCounts,
    activeFilterCount,
    setQuery,
    setType,
    setPrefecture,
    setLanguage,
    setSort,
    clearAll,
  };
}
