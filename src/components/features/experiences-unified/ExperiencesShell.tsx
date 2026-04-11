"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { featureFlags } from "@/lib/env/featureFlags";
import { CategoryBar } from "@/components/features/places/CategoryBar";
import { useAllExperiences } from "@/hooks/useAllExperiences";
import { useExperienceFilters, EXPERIENCE_SORT_OPTIONS, DURATION_FILTERS } from "@/hooks/useExperienceFilters";
import type { Location } from "@/types/location";
import type { ExperienceType } from "@/types/experience";
import { EXPERIENCE_TYPES } from "@/data/experienceTypes";
import { CRAFT_TYPES, type CraftTypeId } from "@/data/craftTypes";

/* ── Dynamic imports ────────────────────────────────────── */

const ExperiencesIntro = dynamic(
  () => import("./ExperiencesIntro").then((m) => ({ default: m.ExperiencesIntro })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <p className="font-serif text-2xl sm:text-3xl text-foreground text-center">
          Experiences
        </p>
      </div>
    ),
  },
);

const ExperienceFilterPanel = dynamic(
  () => import("./ExperienceFilterPanel").then((m) => ({ default: m.ExperienceFilterPanel })),
  { ssr: false },
);

// Workshop-specific sections (reused from craft A)
const CraftTaxonomy = dynamic(
  () => import("@/components/features/craft/CraftTaxonomy").then((m) => ({ default: m.CraftTaxonomy })),
  { ssr: false },
);

const CraftSeasonalBanner = dynamic(
  () => import("@/components/features/craft/CraftSeasonalBanner").then((m) => ({ default: m.CraftSeasonalBanner })),
  { ssr: false },
);

const CraftWorkshopSection = dynamic(
  () => import("@/components/features/craft/CraftWorkshopSection").then((m) => ({ default: m.CraftWorkshopSection })),
  { ssr: false },
);

// Shared components
const PlacesMapLayout = dynamic(
  () => import("@/components/features/places/PlacesMapLayout").then((m) => ({ default: m.PlacesMapLayout })),
  { ssr: false },
);

const LocationExpanded = dynamic(
  () => import("@/components/features/places/LocationExpanded").then((m) => ({ default: m.LocationExpanded })),
  { ssr: false },
);

const LocationEditorialGrid = dynamic(
  () => import("@/components/features/places/LocationEditorialGrid").then((m) => ({ default: m.LocationEditorialGrid })),
  { ssr: false },
);

/* ── Shell ────────────────────────────────────────────────── */

export function ExperiencesShell() {
  const searchParams = useSearchParams();
  const { experiences, total, isLoading, error } = useAllExperiences();
  const isError = !!error;

  const {
    setQuery,
    selectedType, setSelectedType,
    selectedCraftType, setSelectedCraftType,
    selectedPrefectures, setSelectedPrefectures,
    selectedDuration, setSelectedDuration,
    selectedSort, setSelectedSort,
    setPage, hasMore,
    filteredExperiences,
    sortedExperiences,
    visibleExperiences,
    prefectureOptions,
    typeCounts,
    craftTypeCounts,
    activeFilters,
    activeFilterCount,
    removeFilter,
    clearAllFilters,
  } = useExperienceFilters(experiences);

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<Location | null>(null);

  // ── Search input state ──
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    setQuery(inputValue);
  }, [inputValue, setQuery]);

  // ── Sync ?type= URL param ──
  const typeParam = searchParams.get("type");

  useEffect(() => {
    if (typeParam && EXPERIENCE_TYPES.some((et) => et.id === typeParam)) {
      setSelectedType(typeParam as ExperienceType);
    }
  }, [typeParam, setSelectedType]);

  // ── Sync ?craftType= URL param ──
  const craftTypeParam = searchParams.get("craftType");

  useEffect(() => {
    if (craftTypeParam && CRAFT_TYPES.some((ct) => ct.id === craftTypeParam)) {
      setSelectedCraftType(craftTypeParam as CraftTypeId);
    }
  }, [craftTypeParam, setSelectedCraftType]);

  // ── Deep-link ?location= ──
  const locationParam = searchParams.get("location");
  const didAutoExpandRef = useRef(false);

  useEffect(() => {
    if (!locationParam || didAutoExpandRef.current || !experiences || experiences.length === 0) return;

    const match = experiences.find((exp) => exp.id === locationParam);
    if (match) {
      setExpandedLocation(match);
      setFlyToLocation(match);
      didAutoExpandRef.current = true;
      window.history.replaceState(null, "", "/experiences");
    }
  }, [locationParam, experiences]);

  // ── Infinite scroll ──
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPage((current) => current + 1);
        }
      },
      { rootMargin: "0px 0px 200% 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, visibleExperiences.length, setPage]);

  const handleSelectLocation = useCallback((location: Location) => {
    setExpandedLocation(location);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setExpandedLocation(null);
  }, []);

  const mapAvailable = useMemo(
    () => featureFlags.enableMapbox && !featureFlags.cheapMode,
    [],
  );

  // Mappable experiences
  const mappableExperiences = useMemo(
    () => filteredExperiences.filter((e) => e.coordinates?.lat && e.coordinates?.lng),
    [filteredExperiences],
  );

  const mappableSorted = useMemo(
    () => sortedExperiences.filter((e) => e.coordinates?.lat && e.coordinates?.lng),
    [sortedExperiences],
  );

  // Workshop craft type images
  const craftTypeImages = useMemo(() => {
    const map = new Map<string, string>();
    if (experiences?.length) {
      const seen = new Map<string, Set<string>>();
      const best = new Map<string, { photo: string; rating: number }>();
      for (const loc of experiences) {
        if (loc.category !== "workshop") continue;
        const photo = loc.primaryPhotoUrl || loc.image;
        if (!loc.craftType || !photo) continue;
        const urls = seen.get(loc.craftType) ?? new Set();
        urls.add(photo);
        seen.set(loc.craftType, urls);
        const prev = best.get(loc.craftType);
        if (!prev || (loc.rating ?? 0) > prev.rating) {
          best.set(loc.craftType, { photo, rating: loc.rating ?? 0 });
        }
      }
      for (const [type, urls] of seen) {
        if (urls.size > 1) {
          map.set(type, best.get(type)!.photo);
        }
      }
    }
    for (const ct of CRAFT_TYPES) {
      if (!map.has(ct.id) && ct.thumbnail) {
        map.set(ct.id, ct.thumbnail);
      }
    }
    return map;
  }, [experiences]);

  const handleTaxonomySelect = useCallback((craftType: CraftTypeId) => {
    setSelectedCraftType(craftType);
  }, [setSelectedCraftType]);

  const isWorkshopTab = selectedType === "workshop";

  return (
    <div className="min-h-[100dvh] bg-background">
      <ExperiencesIntro totalCount={total} />

      {/* Workshop sub-content */}
      {isWorkshopTab && (
        <CraftSeasonalBanner onSelectCraftType={handleTaxonomySelect} />
      )}

      {/* Error state */}
      {isError ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="mx-auto max-w-md px-4 text-center">
            <div className="rounded-lg border border-error/30 bg-error/10 p-4 sm:p-8">
              <p className="text-base font-semibold text-error mb-2">Something went wrong loading experiences</p>
              <p className="text-sm text-error mb-6">{error ?? "Please try again."}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-error px-5 py-2.5 text-sm font-semibold text-white hover:bg-error/90 transition focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <CategoryBar
            onFiltersClick={() => setIsFilterPanelOpen(true)}
            activeFilterCount={activeFilterCount}
            activeFilters={activeFilters}
            onRemoveFilter={removeFilter}
            onClearAllFilters={clearAllFilters}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onInputSubmit={() => {}}
          />

          {/* Workshop taxonomy */}
          {isWorkshopTab && !selectedCraftType && (
            <div className="mt-4">
              <CraftTaxonomy counts={craftTypeCounts} onSelect={handleTaxonomySelect} images={craftTypeImages} />
            </div>
          )}

          {/* Workshop carousel */}
          {isWorkshopTab && (
            <CraftWorkshopSection selectedCraftType={selectedCraftType} />
          )}

          {/* Breathing room */}
          <div className="h-4 sm:h-6" aria-hidden="true" />

          {/* Main content */}
          {mapAvailable ? (
            <PlacesMapLayout
              filteredLocations={mappableExperiences}
              sortedLocations={mappableSorted}
              totalCount={mappableSorted.length}
              onSelectLocation={handleSelectLocation}
              isLoading={isLoading}
              isChatOpen={false}
              onChatClose={() => {}}
              hasActiveChips={activeFilters.filter((f) => f.type !== "search" && f.type !== "experienceType").length > 0}
              flyToLocation={flyToLocation}
              useCraftTypeColors={isWorkshopTab}
            />
          ) : isLoading ? (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
              <div className="space-y-10">
                <div className="aspect-[16/9] rounded-lg shimmer" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="aspect-[3/4] rounded-lg shimmer" />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
              <LocationEditorialGrid
                locations={visibleExperiences}
                onSelect={handleSelectLocation}
                totalCount={total}
                activeCategory={null}
              />

              {hasMore && (
                <div ref={sentinelRef} className="py-8 flex justify-center">
                  <div className="h-[2px] w-32 bg-brand-primary/30 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-brand-primary rounded-full animate-pulse" />
                  </div>
                </div>
              )}

              {!hasMore && visibleExperiences.length > 0 && (
                <div className="py-16 text-center">
                  <p className="font-serif text-lg text-stone">
                    That&apos;s all {sortedExperiences.length.toLocaleString()} experiences.
                  </p>
                </div>
              )}
            </main>
          )}

          {/* Filter Panel */}
          <ExperienceFilterPanel
            isOpen={isFilterPanelOpen}
            onClose={() => setIsFilterPanelOpen(false)}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            typeCounts={typeCounts}
            selectedCraftType={selectedCraftType}
            onCraftTypeChange={setSelectedCraftType}
            craftTypeCounts={craftTypeCounts}
            prefectureOptions={prefectureOptions}
            selectedPrefectures={selectedPrefectures}
            onPrefecturesChange={setSelectedPrefectures}
            durationOptions={DURATION_FILTERS.map(({ id, label }) => ({
              value: id,
              label,
            }))}
            selectedDuration={selectedDuration}
            onDurationChange={setSelectedDuration}
            sortOptions={EXPERIENCE_SORT_OPTIONS}
            selectedSort={selectedSort}
            onSortChange={setSelectedSort}
            resultsCount={activeFilters.length === 0 ? total : filteredExperiences.length}
            onClearAll={clearAllFilters}
          />

          {/* Location Detail Panel */}
          {expandedLocation && (
            <LocationExpanded
              location={expandedLocation}
              onClose={handleCloseExpanded}
            />
          )}
        </>
      )}
    </div>
  );
}
