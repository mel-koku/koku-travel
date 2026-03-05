"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { easeReveal } from "@/lib/motion";
import { useAllPeople } from "@/hooks/usePeopleQuery";
import { usePeopleFilters } from "@/hooks/usePeopleFilters";
import { PersonCard } from "./PersonCard";
import { PersonDetailPanel } from "./PersonDetailPanel";
import type { Person, PersonType } from "@/types/person";

const PAGE_SIZE = 40;

const TYPE_TABS: { label: string; value: PersonType | null }[] = [
  { label: "All", value: null },
  { label: "Artisans", value: "artisan" },
  { label: "Guides", value: "guide" },
  { label: "Interpreters", value: "interpreter" },
  { label: "Authors", value: "author" },
];

export function LocalExpertsShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: allPeople, isLoading } = useAllPeople();

  const {
    filters,
    filteredPeople,
    typeCounts,
    setQuery,
    setType,
    setCity,
  } = usePeopleFilters(allPeople);

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filteredPeople.length]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + PAGE_SIZE, filteredPeople.length)
          );
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredPeople.length]);

  // Auto-filter from ?type= and ?city= URL params
  useEffect(() => {
    const typeParam = searchParams.get("type") as PersonType | null;
    if (typeParam && TYPE_TABS.some((t) => t.value === typeParam)) {
      setType(typeParam);
    }
    const cityParam = searchParams.get("city");
    if (cityParam) {
      setCity(cityParam);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link
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

  const total = allPeople?.length ?? 0;
  const visible = filteredPeople.slice(0, visibleCount);

  return (
    <>
      {/* Intro */}
      <section className="px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              ease: [...easeReveal] as [number, number, number, number],
            }}
            className="eyebrow-editorial"
          >
            {total} local experts across Japan
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.1,
              ease: [...easeReveal] as [number, number, number, number],
            }}
            className="mt-4 font-serif text-4xl italic text-foreground sm:text-5xl lg:text-6xl"
          >
            Meet the people behind the experiences
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.2,
              ease: [...easeReveal] as [number, number, number, number],
            }}
            className="mx-auto mt-4 max-w-2xl text-base text-foreground-secondary"
          >
            Artisans and guides who bring Japan to life. Browse by specialty,
            city, or craft — then request a booking directly.
          </motion.p>
        </div>
      </section>

      {/* Category bar + Search */}
      <div className="sticky top-[var(--header-h,64px)] z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {/* Type tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {TYPE_TABS.map((tab) => {
              const isActive = filters.type === tab.value;
              const count =
                tab.value === null ? total : typeCounts[tab.value] ?? 0;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setType(tab.value)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-foreground text-background"
                      : "text-foreground-secondary hover:bg-surface hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-xs ${
                      isActive ? "opacity-70" : "text-stone"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or specialty"
              className="h-9 w-44 rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary/30 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl bg-surface"
              />
            ))}
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-semibold text-foreground">
              No experts found
            </p>
            <p className="mt-2 text-sm text-foreground-secondary">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {visible.map((person, i) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  index={i}
                  onClick={() => handlePersonClick(person)}
                />
              ))}
            </div>
            {visibleCount < filteredPeople.length && (
              <div ref={sentinelRef} className="h-10" aria-hidden />
            )}
          </>
        )}
      </section>

      <PersonDetailPanel
        person={selectedPerson}
        onClose={handleCloseDetail}
      />
    </>
  );
}
