"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { easeReveal } from "@/lib/motion";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";
import { useAllPeople } from "@/hooks/usePeopleQuery";
import { usePeopleFilters } from "@/hooks/usePeopleFilters";
import {
  ACTIVITY_CATEGORIES,
  ALL_EXPERTS_IMAGE,
  getSpecialtiesForCategory,
} from "@/lib/activityCategories";
import { PersonCard } from "./PersonCard";
import { PersonDetailPanel } from "./PersonDetailPanel";
import type { Person } from "@/types/person";

const PAGE_SIZE = 40;

export function LocalExpertsShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: allPeople, isLoading } = useAllPeople();

  const { filters, filteredPeople, setQuery, setActivity, setCity } =
    usePeopleFilters(allPeople);

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

  // Auto-filter from URL params
  useEffect(() => {
    const activityParam = searchParams.get("activity");
    if (activityParam) setActivity(activityParam);
    const cityParam = searchParams.get("city");
    if (cityParam) setCity(cityParam);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link to person
  useEffect(() => {
    const slug = searchParams.get("person");
    if (slug && allPeople) {
      const person = allPeople.find((p) => p.slug === slug);
      if (person) setSelectedPerson(person);
    }
  }, [searchParams, allPeople]);

  // Activity counts
  const activityCounts = useMemo(() => {
    if (!allPeople) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const cat of ACTIVITY_CATEGORIES) {
      const validSpecialties = getSpecialtiesForCategory(cat.id);
      counts[cat.id] = allPeople.filter((p) =>
        p.specialties.some((s) => validSpecialties.has(s.toLowerCase()))
      ).length;
    }
    return counts;
  }, [allPeople]);

  const handleActivitySelect = useCallback(
    (id: string | null) => {
      setActivity(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("activity", id);
      } else {
        params.delete("activity");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, setActivity]
  );

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
  const activeCategory = ACTIVITY_CATEGORIES.find(
    (c) => c.id === filters.activity
  );

  return (
    <>
      {/* Hero */}
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
            className={`mt-4 ${cn(typography({ intent: "editorial-hero" }), "text-4xl sm:text-5xl lg:text-6xl")}`}
          >
            Learn Japan from the people who live it
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
            Pick what you want to do. We&apos;ll show you the right person.
          </motion.p>
        </div>
      </section>

      {/* Activity category grid — editorial photo tiles */}
      <section className="px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {/* All experts tile — spans 2 cols for emphasis */}
            <button
              type="button"
              onClick={() => handleActivitySelect(null)}
              className="group relative col-span-2 overflow-hidden rounded-lg sm:col-span-1"
            >
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg">
                <Image
                  src={ALL_EXPERTS_IMAGE}
                  alt="All experts"
                  fill
                  className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
                  sizes="(min-width:1280px) 320px, (min-width:640px) 33vw, 50vw"
                />
                <div className="absolute inset-0 scrim-80" />
                {!filters.activity && (
                  <div className="absolute inset-0 rounded-lg ring-2 ring-inset ring-brand-primary" />
                )}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className={cn(typography({ intent: "editorial-h3" }), "text-white leading-tight")}>
                    All experts
                  </h3>
                  <p className="mt-0.5 font-mono text-xs text-white/60">
                    {total} people
                  </p>
                </div>
                {!filters.activity && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-xl bg-brand-primary" />
                )}
              </div>
            </button>

            {ACTIVITY_CATEGORIES.map((cat, i) => {
              const isActive = filters.activity === cat.id;
              const count = activityCounts[cat.id] ?? 0;
              return (
                <motion.button
                  key={cat.id}
                  type="button"
                  onClick={() => handleActivitySelect(cat.id)}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.5,
                    delay: (i % 4) * 0.05,
                    ease: [...easeReveal] as [number, number, number, number],
                  }}
                  className="group relative overflow-hidden rounded-lg"
                >
                  <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg">
                    <Image
                      src={cat.image}
                      alt={cat.label}
                      fill
                      className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
                      sizes="(min-width:1280px) 320px, (min-width:640px) 33vw, 50vw"
                    />
                    <div className="absolute inset-0 scrim-80" />
                    {isActive && (
                      <div className="absolute inset-0 rounded-lg ring-2 ring-inset ring-brand-primary" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h3 className={cn(typography({ intent: "editorial-h3" }), "text-white leading-tight transition-colors group-hover:text-brand-primary/90")}>
                        {cat.label}
                      </h3>
                      <p className="mt-0.5 font-mono text-xs text-white/60">
                        {count} {count === 1 ? "person" : "people"}
                      </p>
                    </div>
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-xl bg-brand-primary" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sticky filter bar */}
      <div className="sticky top-[var(--header-h,64px)] z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1">
            {activeCategory ? (
              <p className="truncate text-sm text-foreground-secondary">
                <span className="font-medium text-foreground">
                  {activeCategory.label}
                </span>
                <span className="mx-1.5 text-border">·</span>
                {activeCategory.description}
              </p>
            ) : (
              <p className="text-sm text-foreground-secondary">
                All {total} experts
              </p>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-shrink-0">
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
              placeholder="Search by name or city"
              className="h-9 w-44 rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary/30 sm:w-52"
            />
          </div>
        </div>
      </div>

      {/* Results count */}
      {filters.activity && (
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <p className="text-sm text-foreground-secondary">
            {filteredPeople.length}{" "}
            {filteredPeople.length === 1 ? "expert" : "experts"} for{" "}
            <span className="font-medium text-foreground">
              {activeCategory?.label}
            </span>
          </p>
        </div>
      )}

      {/* People grid */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-lg bg-surface"
              />
            ))}
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-semibold text-foreground">
              No experts found
            </p>
            <p className="mt-2 text-sm text-foreground-secondary">
              Try a different activity or clear your search.
            </p>
            {filters.activity && (
              <button
                type="button"
                onClick={() => handleActivitySelect(null)}
                className="mt-4 text-sm text-brand-primary hover:underline"
              >
                Show all experts
              </button>
            )}
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

      <PersonDetailPanel person={selectedPerson} onClose={handleCloseDetail} />
    </>
  );
}
