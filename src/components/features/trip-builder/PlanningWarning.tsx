"use client";

import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import type { PlanningWarning } from "@/lib/planning/tripWarnings";

export type PlanningWarningCardProps = {
  warning: PlanningWarning;
  className?: string;
  onAction?: (warning: PlanningWarning) => void;
};

/**
 * Displays a single planning warning with appropriate styling based on severity.
 */
export function PlanningWarningCard({ warning, className, onAction }: PlanningWarningCardProps) {
  const severityStyles = {
    info: {
      container: "bg-sage/10 border-sage/20",
      icon: "bg-sage/20",
      title: "text-sage-dark",
    },
    warning: {
      container: "bg-brand-secondary/5 border-brand-secondary/20",
      icon: "bg-brand-secondary/10",
      title: "text-brand-secondary",
    },
    caution: {
      container: "bg-error/5 border-error/20",
      icon: "bg-error/10",
      title: "text-error",
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
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
            styles.icon
          )}
        >
          <warning.icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-semibold", styles.title)}>
            {warning.title}
          </h4>
          <p className="mt-1 text-sm text-foreground-secondary leading-relaxed">
            {warning.message}
          </p>
          {warning.action && onAction && (
            <button
              type="button"
              onClick={() => onAction(warning)}
              className="mt-2 h-9 rounded-lg bg-brand-primary px-4 text-sm font-medium text-white active:scale-[0.98] transition-transform"
            >
              {warning.action}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export type PlanningWarningsListProps = {
  warnings: PlanningWarning[];
  className?: string;
  onAction?: (warning: PlanningWarning) => void;
};

/**
 * Displays a list of planning warnings grouped by severity.
 */
export function PlanningWarningsList({ warnings, className, onAction }: PlanningWarningsListProps) {
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
        <h3 className={cn(typography({ intent: "utility-h2" }), "text-base")}>Travel Tips</h3>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-foreground-secondary">
          {warnings.length}
        </span>
      </div>
      <div className="space-y-2">
        {sortedWarnings.map((warning) => (
          <PlanningWarningCard key={warning.id} warning={warning} onAction={onAction} />
        ))}
      </div>
    </div>
  );
}
