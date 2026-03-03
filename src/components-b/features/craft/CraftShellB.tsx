"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { featureFlags } from "@/lib/env/featureFlags";
import { CategoryBarB } from "@b/features/places/CategoryBarB";
import { useCraftLocations } from "@/hooks/useCraftLocations";
import { useCraftFilters, CRAFT_SORT_OPTIONS, DURATION_FILTERS } from "@/hooks/useCraftFilters";
import type { Location } from "@/types/location";
import { CRAFT_TYPES, type CraftTypeId } from "@/data/craftTypes";

/* ── Dynamic imports ────────────────────────────────────── */

const CraftIntroB = dynamic(
  () => import("./CraftIntroB").then((m) => ({ default: m.CraftIntroB })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <p className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.02em] text-[var(--foreground)] text-center">
          Traditional Crafts
        </p>
      </div>
    ),
  },
);

const CraftTaxonomyB = dynamic(
  () => import("./CraftTaxonomyB").then((m) => ({ default: m.CraftTaxonomyB })),
  { ssr: false },
);

const CraftFilterPanelB = dynamic(
  () => import("./CraftFilterPanelB").then((m) => ({ default: m.CraftFilterPanelB })),
  { ssr: false },
);

const CraftWorkshopSectionB = dynamic(
  () => import("./CraftWorkshopSectionB").then((m) => ({ default: m.CraftWorkshopSectionB })),
  { ssr: false },
);

const CraftSeasonalBannerB = dynamic(
  () => import("./CraftSeasonalBannerB").then((m) => ({ default: m.CraftSeasonalBannerB })),
  { ssr: false },
);

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

export function CraftShellB() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locations, total, isLoading, isError, error } = useCraftLocations();

  const {
    setQuery,
    selectedCraftType, setSelectedCraftType,
    selectedPrefectures, setSelectedPrefectures,
    selectedDuration, setSelectedDuration,
    selectedSort, setSelectedSort,
    filteredLocations,
    sortedLocations,
    prefectureOptions,
    craftTypeCounts,
    activeFilters,
    activeFilterCount,
    removeFilter,
    clearAllFilters,
  } = useCraftFilters(locations);

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
      router.replace(`/b/crafts${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams],
  );

  // ── Craft type tabs for CategoryBarB ──
  const craftTypeTabs = useMemo(() => {
    const allCount = sortedLocations?.length ?? 0;
    const tabs: { id: string | null; label: string; count: number }[] = [
      { id: null, label: "All", count: allCount },
    ];
    for (const ct of CRAFT_TYPES) {
      const count = craftTypeCounts.get(ct.id) ?? 0;
      if (count > 0) {
        tabs.push({ id: ct.id, label: ct.label, count });
      }
    }
    return tabs;
  }, [sortedLocations, craftTypeCounts]);

  // ── Search input state ──
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    setQuery(inputValue);
  }, [inputValue, setQuery]);

  // ── Sync ?type= URL param to selectedCraftType ──
  const typeParam = searchParams.get("type");

  useEffect(() => {
    if (typeParam && CRAFT_TYPES.some((ct) => ct.id === typeParam)) {
      setSelectedCraftType(typeParam as CraftTypeId);
    }
  }, [typeParam, setSelectedCraftType]);

  // ── Slug maps for clean ?location= URLs ──
  const { idToSlug, slugToLocation } = useMemo(() => {
    if (!locations || locations.length === 0) return { idToSlug: new Map<string, string>(), slugToLocation: new Map<string, Location>() };

    const groups = new Map<string, Location[]>();
    for (const loc of locations) {
      const s = slugify(loc.name);
      const group = groups.get(s) ?? [];
      group.push(loc);
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
  }, [locations]);

  // ── Detail panel state ──
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);
  const deepLinkHandled = useRef(false);

  const handleSelectLocation = useCallback((location: Location) => {
    setExpandedLocation(location);
    const slug = idToSlug.get(location.id) ?? location.id;
    const params = new URLSearchParams(searchParams.toString());
    params.set("location", slug);
    const qs = params.toString();
    window.history.pushState(null, "", `/b/crafts${qs ? `?${qs}` : ""}`);
  }, [searchParams, idToSlug]);

  const handleCloseExpanded = useCallback(() => {
    setExpandedLocation(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("location");
    const qs = params.toString();
    window.history.replaceState(null, "", `/b/crafts${qs ? `?${qs}` : ""}`);
  }, [searchParams]);

  // Deep link: ?location={slug}
  const locationParam = searchParams.get("location");

  useEffect(() => {
    if (!locationParam || deepLinkHandled.current) return;
    if (!locations || locations.length === 0) return;

    deepLinkHandled.current = true;
    const match = slugToLocation.get(locationParam);
    if (match) {
      setExpandedLocation(match);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("location");
      const qs = params.toString();
      window.history.replaceState(null, "", `/b/crafts${qs ? `?${qs}` : ""}`);
    }
  }, [locationParam, locations, searchParams, slugToLocation]);

  const mapAvailable = useMemo(
    () => featureFlags.enableMapbox && !featureFlags.cheapMode,
    [],
  );

  const handleTabChange = useCallback((tabId: string | null) => {
    setSelectedCraftType(tabId as CraftTypeId | null);
  }, [setSelectedCraftType]);

  // ── Best photo per craft type for taxonomy cards ──
  // Prefer unique location photos; fall back to curated thumbnails from CRAFT_TYPES
  const craftTypeImages = useMemo(() => {
    const map = new Map<string, string>();
    // Collect distinct photos per type from real location data
    if (locations?.length) {
      const seen = new Map<string, Set<string>>();
      const best = new Map<string, { photo: string; rating: number }>();
      for (const loc of locations) {
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
      // Only use location photos if the type has more than one distinct image
      for (const [type, urls] of seen) {
        if (urls.size > 1) {
          map.set(type, best.get(type)!.photo);
        }
      }
    }
    // Fill remaining types with curated thumbnails
    for (const ct of CRAFT_TYPES) {
      if (!map.has(ct.id)) {
        map.set(ct.id, ct.thumbnail);
      }
    }
    return map;
  }, [locations]);

  const handleTaxonomySelect = useCallback((craftType: CraftTypeId) => {
    setSelectedCraftType(craftType);
  }, [setSelectedCraftType]);

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      {viewMode !== "map" && <CraftIntroB totalCount={total} />}

      {viewMode === "grid" && (
        <CraftSeasonalBannerB onSelectCraftType={handleTaxonomySelect} />
      )}

      {/* Error state */}
      {isError ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="mx-auto max-w-md px-4 text-center">
            <div className="rounded-2xl border border-[var(--error)]/30 bg-[var(--error)]/5 p-4 sm:p-8">
              <p className="text-base font-semibold text-[var(--error)] mb-2">
                Something went wrong loading workshops
              </p>
              <p className="text-sm text-[var(--error)] mb-6">{error ?? "Please try again."}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-[var(--error)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
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
            activeFilters={activeFilters}
            onRemoveFilter={removeFilter}
            onClearAllFilters={clearAllFilters}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onInputSubmit={() => {}}
            tabs={craftTypeTabs}
            activeTab={selectedCraftType}
            onTabChange={handleTabChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            mapAvailable={mapAvailable}
          />

          {/* Taxonomy grid — shown in grid mode when no active type filter */}
          {viewMode === "grid" && !selectedCraftType && (
            <div className="mt-4">
              <CraftTaxonomyB counts={craftTypeCounts} onSelect={handleTaxonomySelect} images={craftTypeImages} />
            </div>
          )}

          {/* Workshop experiences carousel */}
          {viewMode === "grid" && (
            <CraftWorkshopSectionB selectedCraftType={selectedCraftType} />
          )}

          {/* Main content — grid or map */}
          {viewMode === "grid" ? (
            <>
              <div className="h-4 sm:h-6" aria-hidden="true" />

              <PlacesGridB
                locations={sortedLocations}
                totalCount={total}
                isLoading={isLoading}
                onClearFilters={() => { clearAllFilters(); }}
                onSelectLocation={handleSelectLocation}
              />
            </>
          ) : mapAvailable ? (
            <PlacesMapLayoutB
              filteredLocations={filteredLocations}
              sortedLocations={sortedLocations}
              totalCount={total}
              isLoading={isLoading}
              hasActiveChips={activeFilters.filter((f) => f.type !== "search").length > 0}
              onSelectLocation={handleSelectLocation}
              useCraftTypeColors
            />
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
          <CraftFilterPanelB
            isOpen={isFilterPanelOpen}
            onClose={() => setIsFilterPanelOpen(false)}
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
            sortOptions={CRAFT_SORT_OPTIONS}
            selectedSort={selectedSort}
            onSortChange={setSelectedSort}
            resultsCount={activeFilters.length === 0 ? total : filteredLocations.length}
            onClearAll={clearAllFilters}
          />
        </>
      )}
    </div>
  );
}
