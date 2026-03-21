"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cEase } from "@c/ui/motionC";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";

export type ConflictBadgeCProps = {
  conflicts: ItineraryConflict[];
  variant?: "inline" | "summary";
  className?: string;
};

const severityConfig = {
  error: { color: "var(--error)" },
  warning: { color: "var(--warning)" },
  info: { color: "var(--success)" },
} as const;

export function ConflictBadgeC({
  conflicts,
  variant = "inline",
  className,
}: ConflictBadgeCProps) {
  const [expanded, setExpanded] = useState(false);

  if (conflicts.length === 0) return null;

  const errorCount = conflicts.filter((c) => c.severity === "error").length;
  const primarySeverity = errorCount > 0 ? "error" : "warning";
  const config = severityConfig[primarySeverity];

  if (variant === "inline") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] border ${className ?? ""}`}
        style={{
          borderColor: config.color,
          color: config.color,
        }}
        title={conflicts.map((c) => c.message).join("; ")}
      >
        <AlertTriangle className="h-3 w-3" />
        {conflicts.length} {conflicts.length === 1 ? "issue" : "issues"}
      </span>
    );
  }

  return (
    <div
      className={`overflow-hidden border ${className ?? ""}`}
      style={{
        borderColor: config.color,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" style={{ color: config.color }} />
          <span
            className="text-xs font-bold uppercase tracking-[0.1em]"
            style={{ color: config.color }}
          >
            {conflicts.length} scheduling{" "}
            {conflicts.length === 1 ? "issue" : "issues"}
          </span>
          {errorCount > 0 && (
            <span
              className="border px-1.5 py-0.5 text-[10px] font-bold"
              style={{
                borderColor: "var(--error)",
                color: "var(--error)",
              }}
            >
              {errorCount} critical
            </span>
          )}
        </div>
        <ChevronDown
          className="h-4 w-4 transition-transform duration-200"
          style={{
            color: "var(--muted-foreground)",
            transform: expanded ? "rotate(180deg)" : undefined,
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: cEase }}
            className="overflow-hidden"
          >
            <div
              className="space-y-2 border-t px-3 pb-3 pt-2"
              style={{ borderColor: "var(--border)" }}
            >
              {conflicts.map((conflict) => {
                const cConfig = severityConfig[conflict.severity];
                return (
                  <div
                    key={conflict.id}
                    className="border p-2"
                    style={{
                      borderColor: cConfig.color,
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm">{conflict.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-bold"
                          style={{ color: "var(--foreground)" }}
                        >
                          {conflict.title}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {conflict.activityTitle}: {conflict.message}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export type DayConflictSummaryCProps = {
  dayConflicts: ItineraryConflict[];
  className?: string;
};

export function DayConflictSummaryC({
  dayConflicts,
  className,
}: DayConflictSummaryCProps) {
  if (dayConflicts.length === 0) return null;

  const tightCount = dayConflicts.filter(
    (c) => c.type === "insufficient_travel_time",
  ).length;

  return (
    <div className={className}>
      <ConflictBadgeC conflicts={dayConflicts} variant="summary" />
      {tightCount > 0 && (
        <p
          className="mt-2 text-xs font-medium"
          style={{ color: "var(--warning)" }}
        >
          {tightCount} tight {tightCount === 1 ? "connection" : "connections"}{" "}
          today. Consider a slower pace.
        </p>
      )}
    </div>
  );
}
