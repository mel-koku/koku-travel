"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";

export type ConflictBadgeProps = {
  conflicts: ItineraryConflict[];
  variant?: "inline" | "summary";
  className?: string;
};

/**
 * Displays conflict indicators for activities or day summaries.
 * - inline: Shows as a small badge on activity rows
 * - summary: Shows as an expandable panel for day-level summaries
 */
export function ConflictBadge({
  conflicts,
  variant = "inline",
  className,
}: ConflictBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  if (conflicts.length === 0) {
    return null;
  }

  const errorCount = conflicts.filter((c) => c.severity === "error").length;
  const warningCount = conflicts.filter((c) => c.severity === "warning").length;

  // Determine primary severity for styling
  const primarySeverity = errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "info";

  const severityStyles = {
    error: {
      badge: "bg-error/10 text-error border-error/20",
      icon: "⚠️",
    },
    warning: {
      badge: "bg-warning/10 text-warning border-warning/20",
      icon: "⚠️",
    },
    info: {
      badge: "bg-sage/10 text-sage border-sage/20",
      icon: "ℹ️",
    },
  };

  const styles = severityStyles[primarySeverity];

  if (variant === "inline") {
    // Simple inline badge for activity rows
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
          styles.badge,
          className
        )}
        title={conflicts.map((c) => c.message).join("; ")}
      >
        {styles.icon} {conflicts.length} {conflicts.length === 1 ? "issue" : "issues"}
      </span>
    );
  }

  // Summary variant with expandable details
  return (
    <div className={cn("rounded-xl border", styles.badge, className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{styles.icon}</span>
          <span className="text-sm font-semibold">
            {conflicts.length} scheduling {conflicts.length === 1 ? "issue" : "issues"}
          </span>
          {errorCount > 0 && (
            <span className="rounded-full bg-error/20 px-1.5 py-0.5 text-[10px] font-bold text-error">
              {errorCount} critical
            </span>
          )}
        </div>
        <span className="text-stone">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="border-t border-inherit p-3 space-y-2">
          {conflicts.map((conflict) => (
            <ConflictItem key={conflict.id} conflict={conflict} />
          ))}
        </div>
      )}
    </div>
  );
}

type ConflictItemProps = {
  conflict: ItineraryConflict;
};

function ConflictItem({ conflict }: ConflictItemProps) {
  const severityStyles = {
    error: "border-error/30 bg-error/5",
    warning: "border-warning/30 bg-warning/5",
    info: "border-sage/30 bg-sage/5",
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-2",
        severityStyles[conflict.severity]
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm">{conflict.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">
            {conflict.title}
          </p>
          <p className="text-xs text-foreground-secondary">
            {conflict.activityTitle}: {conflict.message}
          </p>
        </div>
      </div>
    </div>
  );
}

export type DayConflictSummaryProps = {
  dayConflicts: ItineraryConflict[];
  className?: string;
};

/**
 * Shows a summary of all conflicts for a day in the day header.
 */
export function DayConflictSummary({
  dayConflicts,
  className,
}: DayConflictSummaryProps) {
  if (dayConflicts.length === 0) {
    return null;
  }

  const tightCount = dayConflicts.filter((c) => c.type === "insufficient_travel_time").length;

  return (
    <div className={className}>
      <ConflictBadge
        conflicts={dayConflicts}
        variant="summary"
      />
      {tightCount > 0 && (
        <p className="mt-2 text-xs text-warning">
          {tightCount} tight {tightCount === 1 ? "connection" : "connections"} today — consider a slower pace
        </p>
      )}
    </div>
  );
}

export type ActivityConflictIndicatorProps = {
  conflicts: ItineraryConflict[];
  className?: string;
};

/**
 * Small indicator for activity rows showing if there are conflicts.
 */
export function ActivityConflictIndicator({
  conflicts,
  className,
}: ActivityConflictIndicatorProps) {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <ConflictBadge
      conflicts={conflicts}
      variant="inline"
      className={className}
    />
  );
}
