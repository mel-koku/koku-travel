"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  culture: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  food: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  nature: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  shopping: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  view: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

type StickyExploreHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  totalCount: number;
  categories: readonly { value: string; label: string }[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  onFiltersClick: () => void;
  activeFilterCount: number;
};

const SCROLL_THRESHOLD = 80;

export function StickyExploreHeader({
  query,
  onQueryChange,
  totalCount,
  categories,
  selectedCategories,
  onCategoriesChange,
  onFiltersClick,
  activeFilterCount,
}: StickyExploreHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Track scroll position to collapse/expand header
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsCollapsed(scrollY > SCROLL_THRESHOLD);

      // Close expanded search when scrolling back to top
      if (scrollY <= SCROLL_THRESHOLD && isSearchExpanded) {
        setIsSearchExpanded(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isSearchExpanded]);

  // Focus search input when expanded
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  }, []);

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener("resize", updateScrollButtons);
    return () => window.removeEventListener("resize", updateScrollButtons);
  }, [updateScrollButtons]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const toggleCategory = (categoryValue: string) => {
    if (selectedCategories.includes(categoryValue)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== categoryValue));
    } else {
      onCategoriesChange([...selectedCategories, categoryValue]);
    }
  };

  const handleSearchClick = () => {
    if (isCollapsed) {
      setIsSearchExpanded(true);
    }
  };

  const handleSearchClose = () => {
    setIsSearchExpanded(false);
  };

  return (
    <>
      {/* Expanded header - shows when at top of page */}
      <div
        className={cn(
          "bg-white border-b border-gray-100 transition-all duration-300",
          isCollapsed ? "h-0 overflow-hidden opacity-0" : "h-auto opacity-100"
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                Explore Japan
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Discover {totalCount.toLocaleString()} unique destinations
              </p>
            </div>

            {/* Full search bar */}
            <div className="relative w-full sm:w-80 lg:w-96">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search destinations..."
                className="w-full rounded-full border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 hover:shadow-md"
              />
              {query && (
                <button
                  onClick={() => onQueryChange("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky header with categories + compact search */}
      <div className="sticky top-20 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3">
            {/* Scroll left button */}
            {canScrollLeft && (
              <button
                onClick={() => scroll("left")}
                className="hidden sm:flex shrink-0 h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white shadow-sm hover:shadow-md transition"
                aria-label="Scroll left"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Categories container */}
            <div
              ref={scrollContainerRef}
              onScroll={updateScrollButtons}
              className="flex-1 overflow-x-auto scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="flex gap-6 min-w-max px-1">
                {categories.map((category) => {
                  const isSelected = selectedCategories.includes(category.value);
                  const icon = CATEGORY_ICONS[category.value.toLowerCase()];

                  return (
                    <button
                      key={category.value}
                      onClick={() => toggleCategory(category.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 pb-2 pt-1 border-b-2 transition-all min-w-[48px]",
                        isSelected
                          ? "border-gray-900 text-gray-900"
                          : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                      )}
                    >
                      <span className={cn(
                        "transition-opacity",
                        isSelected ? "opacity-100" : "opacity-70"
                      )}>
                        {icon || (
                          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                            <path d="M6 6h.008v.008H6V6z" />
                          </svg>
                        )}
                      </span>
                      <span className="text-xs font-medium whitespace-nowrap">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scroll right button */}
            {canScrollRight && (
              <button
                onClick={() => scroll("right")}
                className="hidden sm:flex shrink-0 h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white shadow-sm hover:shadow-md transition"
                aria-label="Scroll right"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Compact search button - shows when scrolled (on the right) */}
            <button
              onClick={handleSearchClick}
              className={cn(
                "shrink-0 flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-all duration-300",
                isCollapsed
                  ? "opacity-100 w-auto border-gray-300 bg-white hover:shadow-md hover:border-gray-400"
                  : "opacity-0 w-0 overflow-hidden border-transparent p-0",
                query && isCollapsed && "border-gray-900 bg-gray-900 text-white"
              )}
            >
              <svg
                className={cn("h-4 w-4", query && isCollapsed ? "text-white" : "text-gray-500")}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className={cn(
                "max-w-[120px] truncate",
                query && isCollapsed ? "text-white" : "text-gray-700"
              )}>
                {query || "Search"}
              </span>
            </button>

            {/* Filters button */}
            <button
              onClick={onFiltersClick}
              className={cn(
                "shrink-0 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition hover:shadow-md",
                activeFilterCount > 0
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              )}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-900">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded search overlay - shows when clicking compact search */}
      {isSearchExpanded && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={handleSearchClose}>
          <div
            className="absolute top-20 left-0 right-0 bg-white shadow-lg animate-in slide-in-from-top duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSearchClose}
                  className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition"
                  aria-label="Close search"
                >
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="Search destinations..."
                    className="w-full rounded-full border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  {query && (
                    <button
                      onClick={() => onQueryChange("")}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                      aria-label="Clear search"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
