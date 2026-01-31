"use client";

import { cn } from "@/lib/cn";
import type { PlanningWarning } from "@/lib/planning/tripWarnings";

export type PlanningWarningCardProps = {
  warning: PlanningWarning;
  className?: string;
};

/**
 * Displays a single planning warning with appropriate styling based on severity.
 */
export function PlanningWarningCard({ warning, className }: PlanningWarningCardProps) {
  const severityStyles = {
    info: {
      container: "bg-sage/10 border-sage/20",
      icon: "bg-sage/20",
      title: "text-sage-dark",
    },
    warning: {
      container: "bg-amber-50 border-amber-200",
      icon: "bg-amber-100",
      title: "text-amber-800",
    },
    caution: {
      container: "bg-orange-50 border-orange-200",
      icon: "bg-orange-100",
      title: "text-orange-800",
    },
  };

  const styles = severityStyles[warning.severity];

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        styles.container,
        className
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg",
            styles.icon
          )}
        >
          {warning.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-semibold", styles.title)}>
            {warning.title}
          </h4>
          <p className="mt-1 text-sm text-warm-gray leading-relaxed">
            {warning.message}
          </p>
        </div>
      </div>
    </div>
  );
}

export type PlanningWarningsListProps = {
  warnings: PlanningWarning[];
  className?: string;
};

/**
 * Displays a list of planning warnings grouped by severity.
 */
export function PlanningWarningsList({ warnings, className }: PlanningWarningsListProps) {
  if (warnings.length === 0) {
    return null;
  }

  // Sort warnings: cautions first, then warnings, then info
  const sortedWarnings = [...warnings].sort((a, b) => {
    const order = { caution: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-charcoal">Travel Tips</h3>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-warm-gray">
          {warnings.length}
        </span>
      </div>
      <div className="space-y-2">
        {sortedWarnings.map((warning) => (
          <PlanningWarningCard key={warning.id} warning={warning} />
        ))}
      </div>
    </div>
  );
}
