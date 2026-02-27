"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";

export type ConflictBadgeBProps = {
  conflicts: ItineraryConflict[];
  variant?: "inline" | "summary";
  className?: string;
};

const severityConfig = {
  error: { color: "var(--error)" },
  warning: { color: "var(--warning)" },
  info: { color: "var(--success)" },
} as const;

export function ConflictBadgeB({
  conflicts,
  variant = "inline",
  className,
}: ConflictBadgeBProps) {
  const [expanded, setExpanded] = useState(false);

  if (conflicts.length === 0) return null;

  const errorCount = conflicts.filter((c) => c.severity === "error").length;
  const primarySeverity = errorCount > 0 ? "error" : "warning";
  const config = severityConfig[primarySeverity];

  if (variant === "inline") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${className ?? ""}`}
        style={{
          backgroundColor: `color-mix(in srgb, ${config.color} 10%, transparent)`,
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
      className={`overflow-hidden rounded-2xl ${className ?? ""}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${config.color} 6%, transparent)`,
        border: `1px solid color-mix(in srgb, ${config.color} 20%, transparent)`,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" style={{ color: config.color }} />
          <span
            className="text-sm font-semibold"
            style={{ color: config.color }}
          >
            {conflicts.length} scheduling{" "}
            {conflicts.length === 1 ? "issue" : "issues"}
          </span>
          {errorCount > 0 && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: `color-mix(in srgb, var(--error) 15%, transparent)`,
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
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div
              className="space-y-2 border-t px-3 pb-3 pt-2"
              style={{
                borderColor: `color-mix(in srgb, ${config.color} 15%, transparent)`,
              }}
            >
              {conflicts.map((conflict) => {
                const cConfig = severityConfig[conflict.severity];
                return (
                  <div
                    key={conflict.id}
                    className="rounded-xl p-2"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${cConfig.color} 6%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${cConfig.color} 15%, transparent)`,
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm">{conflict.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-semibold"
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

export type DayConflictSummaryBProps = {
  dayConflicts: ItineraryConflict[];
  className?: string;
};

export function DayConflictSummaryB({
  dayConflicts,
  className,
}: DayConflictSummaryBProps) {
  if (dayConflicts.length === 0) return null;

  const tightCount = dayConflicts.filter(
    (c) => c.type === "insufficient_travel_time",
  ).length;

  return (
    <div className={className}>
      <ConflictBadgeB conflicts={dayConflicts} variant="summary" />
      {tightCount > 0 && (
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--warning)" }}
        >
          {tightCount} tight {tightCount === 1 ? "connection" : "connections"}{" "}
          today — consider a slower pace
        </p>
      )}
    </div>
  );
}
