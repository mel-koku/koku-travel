"use client";

import { useState } from "react";
import { ChevronDown, AlertTriangle, Clock, Phone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  DayAvailabilityIssues,
  BatchAvailabilityResult,
} from "@/lib/availability/availabilityService";

export type AvailabilityAlertBProps = {
  issues: DayAvailabilityIssues;
  className?: string;
  onFindAlternative?: (activityId: string) => void;
};

const severityMap = {
  error: { color: "var(--error)", Icon: AlertTriangle },
  warning: { color: "var(--warning)", Icon: Clock },
  info: { color: "var(--success)", Icon: Phone },
} as const;

export function AvailabilityAlertB({
  issues,
  className,
  onFindAlternative,
}: AvailabilityAlertBProps) {
  const [expanded, setExpanded] = useState(false);

  if (issues.summary.total === 0) return null;

  const hasClosedIssues = issues.summary.closed > 0;
  const hasBusyIssues = issues.summary.busy > 0;
  const severity = hasClosedIssues ? "error" : hasBusyIssues ? "warning" : "info";
  const config = severityMap[severity];

  const summaryParts: string[] = [];
  if (issues.summary.closed > 0) summaryParts.push(`${issues.summary.closed} may be closed`);
  if (issues.summary.busy > 0) summaryParts.push(`${issues.summary.busy} busy`);
  if (issues.summary.requiresReservation > 0)
    summaryParts.push(`${issues.summary.requiresReservation} need reservations`);

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
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <config.Icon className="h-4 w-4" style={{ color: config.color }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: config.color }}>
              {issues.summary.total}{" "}
              {issues.summary.total === 1 ? "activity" : "activities"} may be
              affected
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {summaryParts.join(", ")}
            </p>
          </div>
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
              {issues.issues.map((issue, index) => (
                <AvailabilityIssueItemB
                  key={`${issue.activityId}-${index}`}
                  issue={issue}
                  onFindAlternative={
                    onFindAlternative && issue.status === "closed"
                      ? () => onFindAlternative(issue.activityId)
                      : undefined
                  }
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AvailabilityIssueItemB({
  issue,
  onFindAlternative,
}: {
  issue: BatchAvailabilityResult;
  onFindAlternative?: () => void;
}) {
  const statusColors: Record<string, string> = {
    closed: "var(--error)",
    busy: "var(--warning)",
    requires_reservation: "var(--success)",
    open: "var(--success)",
    unknown: "var(--muted-foreground)",
  };

  const statusIcons: Record<string, string> = {
    closed: "\uD83D\uDEAB",
    busy: "\u23F0",
    requires_reservation: "\uD83D\uDCDE",
    open: "\u2713",
    unknown: "?",
  };

  const color = statusColors[issue.status] ?? "var(--muted-foreground)";

  return (
    <div
      className="rounded-xl p-2"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 6%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 15%, transparent)`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="text-sm">{statusIcons[issue.status]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {issue.message}
            </p>
            {issue.operatingHours && (
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                Hours: {issue.operatingHours.opensAt} -{" "}
                {issue.operatingHours.closesAt}
              </p>
            )}
          </div>
        </div>
        {onFindAlternative && (
          <button
            type="button"
            onClick={onFindAlternative}
            className="shrink-0 rounded-xl px-2 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
              color: "var(--primary)",
            }}
          >
            Find alternative
          </button>
        )}
      </div>
    </div>
  );
}
