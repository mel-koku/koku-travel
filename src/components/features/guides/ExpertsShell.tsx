"use client";

import { useMemo, useState } from "react";
import type { ExpertProfile } from "@/types/expert";
import ExpertCard from "./ExpertCard";
import ExpertsFilterBar from "./ExpertsFilterBar";

export default function ExpertsShell({ experts }: { experts: ExpertProfile[] }) {
  const [query, setQuery] = useState("");
  const [expertiseFilter, setExpertiseFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");

  const filtered = useMemo(() => {
    return experts.filter((expert) => {
      const matchesQuery =
        !query ||
        expert.name.toLowerCase().includes(query.toLowerCase()) ||
        expert.bio.toLowerCase().includes(query.toLowerCase()) ||
        expert.expertise.some((area) =>
          area.toLowerCase().includes(query.toLowerCase()),
        ) ||
        expert.location?.toLowerCase().includes(query.toLowerCase());

      const matchesExpertise =
        !expertiseFilter ||
        expert.expertise.some(
          (area) => area.toLowerCase() === expertiseFilter.toLowerCase(),
        );

      const matchesLanguage =
        !languageFilter ||
        expert.languages.some(
          (lang) => lang.toLowerCase() === languageFilter.toLowerCase(),
        );

      return matchesQuery && matchesExpertise && matchesLanguage;
    });
  }, [experts, query, expertiseFilter, languageFilter]);

  // Get unique expertise areas and languages for filters
  const allExpertise = useMemo(() => {
    const expertiseSet = new Set<string>();
    experts.forEach((expert) => {
      expert.expertise.forEach((area) => expertiseSet.add(area));
    });
    return Array.from(expertiseSet).sort();
  }, [experts]);

  const allLanguages = useMemo(() => {
    const languagesSet = new Set<string>();
    experts.forEach((expert) => {
      expert.languages.forEach((lang) => languagesSet.add(lang));
    });
    return Array.from(languagesSet).sort();
  }, [experts]);

  return (
    <section className="max-w-screen-xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Expert Guides
        </h1>
        <p className="text-gray-600">
          Discover our community of travel experts and local guides
        </p>
      </div>

      {/* Filter Bar */}
      <ExpertsFilterBar
        query={query}
        setQuery={setQuery}
        expertiseFilter={expertiseFilter}
        setExpertiseFilter={setExpertiseFilter}
        languageFilter={languageFilter}
        setLanguageFilter={setLanguageFilter}
        allExpertise={allExpertise}
        allLanguages={allLanguages}
      />

      {/* Results Count */}
      <div className="mt-6 mb-4">
        <p className="text-sm text-gray-600">
          {filtered.length === experts.length
            ? `Showing all ${filtered.length} expert${filtered.length !== 1 ? "s" : ""}`
            : `Showing ${filtered.length} of ${experts.length} expert${experts.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Experts Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-2">No experts found</p>
          <p className="text-gray-400 text-sm">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </section>
  );
}

