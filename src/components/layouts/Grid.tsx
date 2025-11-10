import { ReactNode } from "react";

import { cn } from "@/lib/cn";

type GridColumns = 1 | 2 | 3 | 4;
type GridGap = "sm" | "md" | "lg";

const columnClassMap: Record<GridColumns, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2 md:grid-cols-2 sm:grid-cols-1",
  3: "grid-cols-3 md:grid-cols-2 sm:grid-cols-1",
  4: "grid-cols-4 md:grid-cols-3 sm:grid-cols-1",
};

const gapClassMap: Record<GridGap, string> = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
};

export type GridProps = {
  /**
   * Number of columns the grid should target on larger screens.
   */
  cols?: GridColumns;
  /**
   * Consistent spacing scale between grid items.
   */
  gap?: GridGap;
  /**
   * Additional classes applied to the grid element.
   */
  className?: string;
  children: ReactNode;
};

/**
 * A responsive grid helper that defaults to desktop layouts, then adjusts down.
 */
export function Grid({
  cols = 3,
  gap = "lg",
  className,
  children,
}: GridProps) {
  return (
    <div
      className={cn(
        "grid items-start",
        columnClassMap[cols],
        gapClassMap[gap],
        className,
      )}
    >
      {children}
    </div>
  );
}


