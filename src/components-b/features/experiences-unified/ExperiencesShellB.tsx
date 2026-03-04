"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { featureFlags } from "@/lib/env/featureFlags";
import { CategoryBarB } from "@b/features/places/CategoryBarB";
import { useAllExperiences } from "@/hooks/useAllExperiences";
import { useExperienceFilters, EXPERIENCE_SORT_OPTIONS, DURATION_FILTERS } from "@/hooks/useExperienceFilters";
import type { Location } from "@/types/location";
import type { ExperienceType } from "@/types/experience";
import { EXPERIENCE_TYPES } from "@/data/experienceTypes";
import { CRAFT_TYPES, type CraftTypeId } from "@/data/craftTypes";

/* ── Dynamic imports ────────────────────────────────────── */

const ExperiencesIntroB = dynamic(
  () => import("./ExperiencesIntroB").then((m) => ({ default: m.ExperiencesIntroB })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <p className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.02em] text-[var(--foreground)] text-center">
          Experiences
        </p>
      </div>
    ),
  },
);

const ExperienceFilterPanelB = dynamic(
  () => import("./ExperienceFilterPanelB").then((m) => ({ default: m.ExperienceFilterPanelB })),
  { ssr: false },
);

// Workshop-specific sections (reused from craft)
const CraftTaxonomyB = dynamic(
  () => import("@b/features/craft/CraftTaxonomyB").then((m) => ({ default: m.CraftTaxonomyB })),
  { ssr: false },
);

const CraftSeasonalBannerB = dynamic(
  () => import("@b/features/craft/CraftSeasonalBannerB").then((m) => ({ default: m.CraftSeasonalBannerB })),
  { ssr: false },
);

const CraftWorkshopSectionB = dynamic(
  () => import("@b/features/craft/CraftWorkshopSectionB").then((m) => ({ default: m.CraftWorkshopSectionB })),
  { ssr: false },
);

// Shared components
const PlacesGridB = dynamic(
  () => import("@b/features/places/PlacesGridB").then((m) => ({ default: m.PlacesGridB })),
  { ssr: false },
);

const PlacesMapLayoutB = dynamic(
  () => import("@b/features/places/PlacesMapLayoutB").then((m) => ({ default: m.PlacesMapLayoutB })),
  { ssr: false },
);

const PlaceDetailPanelB = dynamic(
  () => import("@b/features/places/PlaceDetailPanelB").then((m) => ({ default: m.PlaceDetailPanelB })),
  { ssr: false },
);

/* ── Helpers ──────────────────────────────────────────────── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ── Shell ────────────────────────────────────────────────── */

export function ExperiencesShellB() {
  const router = useRouter();
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
    filteredExperiences,
    sortedExperiences,
    prefectureOptions,
    typeCounts,
    craftTypeCounts,
    activeFilters,
    activeFilterCount,
    removeFilter,
    clearAllFilters,
  } = useExperienceFilters(experiences);

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // ── View mode (grid / map) synced to URL ──
  const viewParam = searchParams.get("view");
  const [viewMode, setViewModeState] = useState<"grid" | "map">(
    viewParam === "map" ? "map" : "grid",
  );

  const setViewMode = useCallback(
    (mode: "grid" | "map") => {
      setViewModeState(mode);
      const params = new URLSearchParams(searchParams.toString());
      if (mode === "map") {
        params.set("view", "map");
      } else {
        params.delete("view");
      }
      const qs = params.toString();
      router.replace(`/b/experiences${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams],
  );

  // ── Experience type tabs ──
  const experienceTypeTabs = useMemo(() => {
    const allCount = sortedExperiences?.length ?? 0;
    const tabs: { id: string | null; label: string; count: number }[] = [
      { id: null, label: "All", count: allCount },
    ];
    for (const et of EXPERIENCE_TYPES) {
      const count = typeCounts.get(et.id) ?? 0;
      if (count > 0) {
        tabs.push({ id: et.id, label: et.label, count });
      }
    }
    return tabs;
  }, [sortedExperiences, typeCounts]);

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

  // ── Slug maps for clean ?location= URLs ──
  const { idToSlug, slugToLocation } = useMemo(() => {
    if (!experiences || experiences.length === 0) return { idToSlug: new Map<string, string>(), slugToLocation: new Map<string, Location>() };

    const groups = new Map<string, Location[]>();
    for (const exp of experiences) {
      const s = slugify(exp.name);
      const group = groups.get(s) ?? [];
      group.push(exp);
      groups.set(s, group);
    }

    const id2s = new Map<string, string>();
    const s2loc = new Map<string, Location>();

    for (const [nameSlug, locs] of groups) {
      if (locs.length === 1) {
        const only = locs[0]!;
        id2s.set(only.id, nameSlug);
        s2loc.set(nameSlug, only);
      } else {
        for (const loc of locs) {
          const withCity = loc.city ? `${nameSlug}-${slugify(loc.city)}` : nameSlug;
          id2s.set(loc.id, withCity);
          s2loc.set(withCity, loc);
        }
      }
    }

    return { idToSlug: id2s, slugToLocation: s2loc };
  }, [experiences]);

  // ── Detail panel state ──
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);
  const deepLinkHandled = useRef(false);

  const handleSelectLocation = useCallback((location: Location) => {
    setExpandedLocation(location);
    const slug = idToSlug.get(location.id) ?? location.id;
    const params = new URLSearchParams(searchParams.toString());
    params.set("location", slug);
    const qs = params.toString();
    window.history.pushState(null, "", `/b/experiences${qs ? `?${qs}` : ""}`);
  }, [searchParams, idToSlug]);

  const handleCloseExpanded = useCallback(() => {
    setExpandedLocation(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("location");
    const qs = params.toString();
    window.history.replaceState(null, "", `/b/experiences${qs ? `?${qs}` : ""}`);
  }, [searchParams]);

  // Deep link: ?location={slug}
  const locationParam = searchParams.get("location");

  useEffect(() => {
    if (!locationParam || deepLinkHandled.current) return;
    if (!experiences || experiences.length === 0) return;

    deepLinkHandled.current = true;
    const match = slugToLocation.get(locationParam);
    if (match) {
      setExpandedLocation(match);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("location");
      const qs = params.toString();
      window.history.replaceState(null, "", `/b/experiences${qs ? `?${qs}` : ""}`);
    }
  }, [locationParam, experiences, searchParams, slugToLocation]);

  const mapAvailable = useMemo(
    () => featureFlags.enableMapbox && !featureFlags.cheapMode,
    [],
  );

  // Only show experiences with coordinates on the map
  const mappableExperiences = useMemo(
    () => filteredExperiences.filter((e) => e.coordinates?.lat && e.coordinates?.lng),
    [filteredExperiences],
  );

  const mappableSorted = useMemo(
    () => sortedExperiences.filter((e) => e.coordinates?.lat && e.coordinates?.lng),
    [sortedExperiences],
  );

  const unmappableCount = sortedExperiences.length - mappableSorted.length;

  const handleTabChange = useCallback((tabId: string | null) => {
    setSelectedType(tabId as ExperienceType | null);
    // Update URL param
    const params = new URLSearchParams(searchParams.toString());
    if (tabId) {
      params.set("type", tabId);
    } else {
      params.delete("type");
    }
    params.delete("craftType");
    const qs = params.toString();
    router.replace(`/b/experiences${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [setSelectedType, router, searchParams]);

  // ── Workshop craft type images (reused from craft shell) ──
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
      if (!map.has(ct.id)) {
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
    <div className="min-h-[100dvh] bg-[var(--background)]">
      {viewMode !== "map" && <ExperiencesIntroB totalCount={total} />}

      {/* Workshop-specific sub-content */}
      {viewMode === "grid" && isWorkshopTab && (
        <CraftSeasonalBannerB onSelectCraftType={handleTaxonomySelect} />
      )}

      {/* Error state */}
      {isError ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="mx-auto max-w-md px-4 text-center">
            <div className="rounded-2xl border border-[var(--error)]/30 bg-[var(--error)]/5 p-4 sm:p-8">
              <p className="text-base font-semibold text-[var(--error)] mb-2">
                Something went wrong loading experiences
              </p>
              <p className="text-sm text-[var(--error)] mb-6">{error ?? "Please try again."}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-[var(--error)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <CategoryBarB
            onFiltersClick={() => setIsFilterPanelOpen(true)}
            activeFilterCount={activeFilterCount}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onInputSubmit={() => {}}
            tabs={experienceTypeTabs}
            activeTab={selectedType}

            viewMode={viewMode}
            onViewModeChange={setViewMode}
            mapAvailable={mapAvailable}
          />

          {/* Workshop taxonomy — shown in grid when workshop tab active, no craft type filter */}
          {viewMode === "grid" && isWorkshopTab && !selectedCraftType && (
            <div className="mt-4">
              <CraftTaxonomyB counts={craftTypeCounts} onSelect={handleTaxonomySelect} images={craftTypeImages} />
            </div>
          )}

          {/* Workshop Sanity carousel */}
          {viewMode === "grid" && isWorkshopTab && (
            <CraftWorkshopSectionB selectedCraftType={selectedCraftType} />
          )}

          {/* Main content — grid or map */}
          {viewMode === "grid" ? (
            <>
              <div className="h-4 sm:h-6" aria-hidden="true" />

              <PlacesGridB
                locations={sortedExperiences}
                totalCount={total}
                isLoading={isLoading}
                onClearFilters={() => { clearAllFilters(); }}
                onSelectLocation={handleSelectLocation}
              />
            </>
          ) : mapAvailable ? (
            <>
              <PlacesMapLayoutB
                filteredLocations={mappableExperiences}
                sortedLocations={mappableSorted}
                totalCount={mappableSorted.length}
                isLoading={isLoading}
                onSelectLocation={handleSelectLocation}
                useCraftTypeColors={isWorkshopTab}
              />
              {unmappableCount > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
                  <button
                    onClick={() => setViewMode("grid")}
                    className="rounded-xl bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-elevated)] border border-[var(--border)]"
                  >
                    Switch to grid for all {sortedExperiences.length} experiences
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 text-center">
              <p className="text-[var(--muted-foreground)]">Map requires Mapbox to be enabled.</p>
            </div>
          )}

          {/* Detail panel */}
          <AnimatePresence>
            {expandedLocation && (
              <PlaceDetailPanelB
                key={expandedLocation.id}
                location={expandedLocation}
                onClose={handleCloseExpanded}
              />
            )}
          </AnimatePresence>

          {/* Filter panel */}
          <ExperienceFilterPanelB
            isOpen={isFilterPanelOpen}
            onClose={() => setIsFilterPanelOpen(false)}
            selectedType={selectedType}
            onTypeChange={handleTabChange}
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
            activeFilters={activeFilters}
            onRemoveFilter={removeFilter}
          />
        </>
      )}
    </div>
  );
}
