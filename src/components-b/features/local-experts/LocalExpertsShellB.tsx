"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAllPeople } from "@/hooks/usePeopleQuery";
import { usePeopleFilters } from "@/hooks/usePeopleFilters";
import { LocalExpertsIntroB } from "./LocalExpertsIntroB";
import { PeopleCategoryBarB } from "./PeopleCategoryBarB";
import { PeopleFilterPanelB } from "./PeopleFilterPanelB";
import { PeopleGridB } from "./PeopleGridB";
import { PersonDetailPanelB } from "./PersonDetailPanelB";
import type { Person } from "@/types/person";

export function LocalExpertsShellB() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: allPeople, isLoading } = useAllPeople();

  const {
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
  } = usePeopleFilters(allPeople);

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // Auto-filter from ?type= URL param
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam && ["artisan", "guide", "host", "interpreter", "author"].includes(typeParam)) {
      setType(typeParam as Parameters<typeof setType>[0]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link: ?person=slug
  useEffect(() => {
    const slug = searchParams.get("person");
    if (slug && allPeople) {
      const person = allPeople.find((p) => p.slug === slug);
      if (person) setSelectedPerson(person);
    }
  }, [searchParams, allPeople]);

  const handlePersonClick = useCallback(
    (person: Person) => {
      setSelectedPerson(person);
      const params = new URLSearchParams(searchParams.toString());
      params.set("person", person.slug);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedPerson(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("person");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, {
      scroll: false,
    });
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl bg-[var(--surface)]"
            />
          ))}
        </div>
      </div>
    );
  }

  const total = allPeople?.length ?? 0;

  return (
    <>
      <LocalExpertsIntroB total={total} />

      <PeopleCategoryBarB
        query={filters.query}
        onQueryChange={setQuery}
        activeType={filters.type}
        onTypeChange={setType}
        typeCounts={typeCounts}
        total={filteredPeople.length}
        activeFilterCount={activeFilterCount}
        onRefineClick={() => setFilterPanelOpen(true)}
      />

      <PeopleGridB people={filteredPeople} onPersonClick={handlePersonClick} />

      <PeopleFilterPanelB
        isOpen={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        prefectures={prefectures}
        languages={languages}
        selectedPrefecture={filters.prefecture}
        onPrefectureChange={setPrefecture}
        selectedLanguage={filters.language}
        onLanguageChange={setLanguage}
        sort={filters.sort}
        onSortChange={setSort}
        onClearAll={clearAll}
        resultCount={filteredPeople.length}
      />

      <PersonDetailPanelB
        person={selectedPerson}
        onClose={handleCloseDetail}
      />
    </>
  );
}
