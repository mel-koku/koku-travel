"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

type PageItem = { kind: "page"; page: number } | { kind: "ellipsis"; key: string };

function buildPageItems(current: number, total: number): PageItem[] {
  if (total <= 10) {
    return Array.from({ length: total }, (_, i) => ({ kind: "page", page: i + 1 }));
  }

  const items: PageItem[] = [{ kind: "page", page: 1 }];

  // Build a window around current page (current-1, current, current+1)
  // But if we're at the start, show (1, 2, 3) instead
  // And adjust for boundaries
  let windowStart = Math.max(2, current - 1);
  let windowEnd = Math.min(total - 1, current + 1);

  // Expand window if it's small and we have room
  if (windowEnd - windowStart < 2 && windowStart > 2) {
    windowStart = Math.max(2, windowStart - 1);
  }
  if (windowEnd - windowStart < 2 && windowEnd < total - 1) {
    windowEnd = Math.min(total - 1, windowEnd + 1);
  }

  if (windowStart > 2) items.push({ kind: "ellipsis", key: "start" });
  for (let p = windowStart; p <= windowEnd; p++) items.push({ kind: "page", page: p });
  if (windowEnd < total - 1) items.push({ kind: "ellipsis", key: "end" });

  items.push({ kind: "page", page: total });
  return items;
}

export function PlacesPagination({ currentPage, totalPages, onPageChange, className }: Props) {
  if (totalPages <= 1) return null;

  const items = buildPageItems(currentPage, totalPages);
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  const buttonBase =
    "inline-flex items-center justify-center rounded-md font-mono text-sm h-11 w-11 sm:h-10 sm:w-10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1 sm:gap-2", className)}
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={prevDisabled}
        onClick={() => onPageChange(currentPage - 1)}
        className={cn(
          buttonBase,
          "text-foreground hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
        )}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>

      {items.map((item) => {
        if (item.kind === "ellipsis") {
          return (
            <span
              key={item.key}
              aria-hidden
              className="px-2 font-mono text-sm text-foreground-secondary select-none"
            >
              …
            </span>
          );
        }
        const isCurrent = item.page === currentPage;
        return (
          <button
            key={item.page}
            type="button"
            aria-label={`Go to page ${item.page}`}
            aria-current={isCurrent ? "page" : undefined}
            onClick={() => onPageChange(item.page)}
            className={cn(
              buttonBase,
              isCurrent ? "bg-brand-primary text-white" : "text-foreground hover:bg-canvas",
            )}
          >
            {item.page}
          </button>
        );
      })}

      <button
        type="button"
        aria-label="Next page"
        disabled={nextDisabled}
        onClick={() => onPageChange(currentPage + 1)}
        className={cn(
          buttonBase,
          "text-foreground hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
        )}
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  );
}
