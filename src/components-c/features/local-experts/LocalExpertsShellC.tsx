"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAllPeople } from "@/hooks/usePeopleQuery";
import { usePeopleFilters } from "@/hooks/usePeopleFilters";
import type { PeopleSortOption } from "@/hooks/usePeopleFilters";
import { REGION_ORDER, getRegionForPrefecture } from "@/data/prefectures";
import { PersonCardC } from "./PersonCardC";
import { PersonDetailPanelC } from "./PersonDetailPanelC";
import { cEase, fadeUp } from "@c/ui/motionC";
import { cn } from "@/lib/cn";
import type { Person, PersonType } from "@/types/person";

const PAGE_SIZE = 36;

const TYPE_TABS: { label: string; value: PersonType | null }[] = [
  { label: "All", value: null },
  { label: "Artisans", value: "artisan" },
  { label: "Guides", value: "guide" },
  { label: "Interpreters", value: "interpreter" },
];

const SORT_OPTIONS: { label: string; value: PeopleSortOption }[] = [
  { label: "Recommended", value: "recommended" },
  { label: "Most experienced", value: "experience" },
  { label: "Name A-Z", value: "name" },
];

export function LocalExpertsShellC() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefersReducedMotion = useReducedMotion();
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
    setCity,
    setSort,
    clearAll,
  } = usePeopleFilters(allPeople);

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  // Auto-filter from ?type= and ?city= URL params
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (
      typeParam &&
      ["artisan", "guide", "interpreter"].includes(typeParam)
    ) {
      setType(typeParam as Parameters<typeof setType>[0]);
    }
    const cityParam = searchParams.get("city");
    if (cityParam) {
      setCity(cityParam);
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

  // Reset pagination when filtered list changes
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

  // Sticky detection for category bar
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry!.isIntersecting);
      },
      { threshold: 0, rootMargin: "-82px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  // Group prefectures by region for filter panel
  const { grouped, ungrouped, orderedRegions } = useMemo(() => {
    const g = new Map<string, string[]>();
    const u: string[] = [];
    for (const pref of prefectures) {
      const region = getRegionForPrefecture(pref);
      if (region) {
        if (!g.has(region)) g.set(region, []);
        g.get(region)!.push(pref);
      } else {
        u.push(pref);
      }
    }
    const ordered = REGION_ORDER.filter((r) => g.has(r));
    return { grouped: g, ungrouped: u, orderedRegions: ordered };
  }, [prefectures]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10">
        <div className="grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse bg-[var(--surface)]"
            />
          ))}
        </div>
      </div>
    );
  }

  const total = allPeople?.length ?? 0;
  const visible = filteredPeople.slice(0, visibleCount);

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Hero intro                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-[1400px] px-6 pt-32 pb-8 lg:px-10 lg:pt-36">
        <motion.p
          variants={fadeUp(0)}
          initial={prefersReducedMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true }}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]"
        >
          {total} local experts across Japan
        </motion.p>

        <motion.h1
          variants={fadeUp(0.08)}
          initial={prefersReducedMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-4 max-w-2xl text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[1.05] text-[var(--foreground)]"
          style={{
            fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
            letterSpacing: "-0.03em",
          }}
        >
          Meet the people behind the experiences
        </motion.h1>

        <motion.p
          variants={fadeUp(0.16)}
          initial={prefersReducedMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-6 max-w-lg text-base leading-relaxed text-[var(--muted-foreground)]"
        >
          Artisans and guides who bring Japan to life. Browse by specialty,
          city, or craft.
        </motion.p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Sticky category bar                                                */}
      {/* ------------------------------------------------------------------ */}
      <div ref={stickyRef} className="h-0 w-full" aria-hidden="true" />
      <div
        className={cn(
          "sticky transition-[background-color] duration-300",
          isStuck ? "z-50" : "z-40"
        )}
        style={{
          top: isStuck
            ? "calc(var(--header-h) - 3px)"
            : "var(--header-h)",
          backgroundColor: isStuck ? "var(--background)" : undefined,
          borderBottom: isStuck
            ? "1px solid var(--border)"
            : "1px solid transparent",
        }}
      >
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="flex items-center justify-center gap-2 py-2 sm:gap-3">
            {/* Count */}
            <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)] sm:inline">
              {filteredPeople.length.toLocaleString()} people
            </span>

            {/* Search input */}
            <div className="relative w-full max-w-sm min-w-0">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={filters.query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or specialty"
                className="w-full border border-[var(--border)] bg-[var(--background)] py-2.5 pl-9 pr-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none transition"
              />
            </div>

            {/* Refine button */}
            <button
              type="button"
              onClick={() => setFilterPanelOpen(true)}
              className={cn(
                "flex items-center gap-1.5 border bg-white px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] transition shrink-0 focus-visible:outline-none",
                activeFilterCount > 0
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
              )}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
                />
              </svg>
              <span className="hidden sm:inline">Refine</span>
              {activeFilterCount > 0 && (
                <span
                  className="flex h-5 w-5 items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Person grid                                                        */}
      {/* ------------------------------------------------------------------ */}
      {filteredPeople.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p
            className="text-lg font-bold text-[var(--foreground)]"
            style={{
              fontFamily:
                "var(--font-plus-jakarta), system-ui, sans-serif",
              letterSpacing: "-0.03em",
            }}
          >
            No experts found
          </p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-[1400px] px-6 py-6 lg:px-10">
          <div className="grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((person, i) => (
              <PersonCardC
                key={person.id}
                person={person}
                index={i}
                onClick={() => handlePersonClick(person)}
              />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {visibleCount < filteredPeople.length && (
            <div ref={sentinelRef} className="h-10" aria-hidden />
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Filter panel (slide-in from right)                                 */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {filterPanelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-charcoal/30"
              onClick={() => setFilterPanelOpen(false)}
            />

            {/* Panel */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.15 }
                  : { duration: 0.4, ease: cEase }
              }
              className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-md flex-col bg-[var(--background)] border-l border-[var(--border)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                <h2
                  className="text-lg font-bold text-[var(--foreground)]"
                  style={{
                    fontFamily:
                      "var(--font-plus-jakarta), system-ui, sans-serif",
                    letterSpacing: "-0.03em",
                  }}
                >
                  Refine
                </h2>
                <button
                  type="button"
                  onClick={() => setFilterPanelOpen(false)}
                  className="flex h-9 w-9 items-center justify-center text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  aria-label="Close"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div
                className="flex-1 overflow-y-auto px-6 py-6 space-y-8"
                data-lenis-prevent
              >
                {/* Type */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    Type
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {TYPE_TABS.map((tab) => {
                      const count =
                        tab.value === null
                          ? total
                          : typeCounts[tab.value] ?? 0;
                      const isActive = filters.type === tab.value;
                      return (
                        <button
                          key={tab.label}
                          type="button"
                          onClick={() => setType(tab.value)}
                          className={cn(
                            "px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "text-white"
                              : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                          )}
                          style={
                            isActive
                              ? { backgroundColor: "var(--primary)" }
                              : undefined
                          }
                        >
                          {tab.label}{" "}
                          <span className="opacity-60">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    Sort by
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SORT_OPTIONS.map((opt) => {
                      const isActive = filters.sort === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSort(opt.value)}
                          className={cn(
                            "px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "text-white"
                              : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                          )}
                          style={
                            isActive
                              ? { backgroundColor: "var(--primary)" }
                              : undefined
                          }
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Prefecture (grouped by region) */}
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                      Prefecture
                    </p>
                    {filters.prefecture && (
                      <button
                        type="button"
                        onClick={() => setPrefecture(null)}
                        className="text-xs font-medium text-[var(--primary)] hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="mt-3 space-y-3">
                    {orderedRegions.map((region) => (
                      <div key={region}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-1.5">
                          {region}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {grouped.get(region)!.map((pref) => {
                            const isActive =
                              filters.prefecture === pref;
                            return (
                              <button
                                key={pref}
                                type="button"
                                onClick={() =>
                                  setPrefecture(
                                    filters.prefecture === pref
                                      ? null
                                      : pref
                                  )
                                }
                                className={cn(
                                  "px-3 py-2 text-sm font-medium transition-colors",
                                  isActive
                                    ? "text-white"
                                    : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                                )}
                                style={
                                  isActive
                                    ? {
                                        backgroundColor:
                                          "var(--primary)",
                                      }
                                    : undefined
                                }
                              >
                                {pref}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {ungrouped.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-1.5">
                          Other
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {ungrouped.map((pref) => {
                            const isActive =
                              filters.prefecture === pref;
                            return (
                              <button
                                key={pref}
                                type="button"
                                onClick={() =>
                                  setPrefecture(
                                    filters.prefecture === pref
                                      ? null
                                      : pref
                                  )
                                }
                                className={cn(
                                  "px-3 py-2 text-sm font-medium transition-colors",
                                  isActive
                                    ? "text-white"
                                    : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                                )}
                                style={
                                  isActive
                                    ? {
                                        backgroundColor:
                                          "var(--primary)",
                                      }
                                    : undefined
                                }
                              >
                                {pref}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    Language
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setLanguage(null)}
                      className={cn(
                        "px-3 py-2 text-sm font-medium transition-colors",
                        !filters.language
                          ? "text-white"
                          : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                      )}
                      style={
                        !filters.language
                          ? { backgroundColor: "var(--primary)" }
                          : undefined
                      }
                    >
                      Any language
                    </button>
                    {languages.map((lang) => {
                      const isActive = filters.language === lang;
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() =>
                            setLanguage(
                              filters.language === lang ? null : lang
                            )
                          }
                          className={cn(
                            "px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "text-white"
                              : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                          )}
                          style={
                            isActive
                              ? { backgroundColor: "var(--primary)" }
                              : undefined
                          }
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPanelOpen(false)}
                  className="h-11 px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-colors active:scale-[0.98]"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  Show {filteredPeople.length} results
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Person detail panel                                                */}
      {/* ------------------------------------------------------------------ */}
      <PersonDetailPanelC
        person={selectedPerson}
        onClose={handleCloseDetail}
      />
    </>
  );
}
