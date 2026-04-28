"use client";

import { useState } from "react";
import { AlertTriangle, Check, Clock, HelpCircle, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { DayAvailabilityIssues, BatchAvailabilityResult } from "@/lib/availability/availabilityService";

export type AvailabilityAlertProps = {
  issues: DayAvailabilityIssues;
  className?: string;
  onFindAlternative?: (activityId: string) => void;
};

/**
 * Alert banner showing availability issues for a day.
 * Displays at the top of the day when activities may be affected.
 */
export function AvailabilityAlert({
  issues,
  className,
  onFindAlternative,
}: AvailabilityAlertProps) {
  const [expanded, setExpanded] = useState(false);

  if (issues.summary.total === 0) {
    return null;
  }

  const hasClosedIssues = issues.summary.closed > 0;
  const hasBusyIssues = issues.summary.busy > 0;

  // Determine severity
  const severity = hasClosedIssues ? "error" : hasBusyIssues ? "warning" : "info";

  const severityStyles = {
    error: {
      container: "bg-error/10 border-error/20",
      icon: "text-error",
      title: "text-error",
    },
    warning: {
      container: "bg-warning/10 border-warning/20",
      icon: "text-warning",
      title: "text-warning",
    },
    info: {
      container: "bg-sage/10 border-sage/20",
      icon: "text-sage",
      title: "text-sage",
    },
  };

  const styles = severityStyles[severity];

  const summaryText = () => {
    const parts: string[] = [];
    if (issues.summary.closed > 0) {
      parts.push(`${issues.summary.closed} may be closed`);
    }
    if (issues.summary.busy > 0) {
      parts.push(`${issues.summary.busy} busy`);
    }
    if (issues.summary.requiresReservation > 0) {
      parts.push(`${issues.summary.requiresReservation} need reservations`);
    }
    return parts.join(", ");
  };

  return (
    <div
      className={cn(
        "rounded-lg border",
        styles.container,
        className
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <div className="flex items-center gap-2">
          {hasClosedIssues
            ? <AlertTriangle className={cn("h-4 w-4 shrink-0", styles.icon)} aria-hidden="true" />
            : hasBusyIssues
            ? <Clock className={cn("h-4 w-4 shrink-0", styles.icon)} aria-hidden="true" />
            : <Phone className={cn("h-4 w-4 shrink-0", styles.icon)} aria-hidden="true" />
          }
          <div>
            <p className={cn("text-sm font-semibold", styles.title)}>
              {issues.summary.total} {issues.summary.total === 1 ? "activity" : "activities"} may be affected
            </p>
            <p className="text-xs text-foreground-secondary">
              {summaryText()}
            </p>
          </div>
        </div>
        <span className="text-stone text-sm">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="border-t border-inherit p-3 space-y-2">
          {issues.issues.map((issue, index) => (
            <AvailabilityIssueItem
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
      )}
    </div>
  );
}

type AvailabilityIssueItemProps = {
  issue: BatchAvailabilityResult;
  onFindAlternative?: () => void;
};

function AvailabilityIssueItem({ issue, onFindAlternative }: AvailabilityIssueItemProps) {
  const statusStyles = {
    closed: "border-error/30 bg-error/5",
    busy: "border-warning/30 bg-warning/5",
    requires_reservation: "border-sage/30 bg-sage/5",
    open: "border-success/30 bg-success/5",
    unknown: "border-border bg-surface",
  };

  const statusIcons = {
    closed: AlertTriangle,
    busy: Clock,
    requires_reservation: Phone,
    open: Check,
    unknown: HelpCircle,
  };
  const StatusIcon = statusIcons[issue.status];

  return (
    <div
      className={cn(
        "rounded-lg border p-2",
        statusStyles[issue.status]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <StatusIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-foreground-secondary" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground-secondary">
              {issue.message}
            </p>
            {issue.operatingHours && (
              <p className="font-mono text-[11px] text-stone mt-0.5">
                Hours: {issue.operatingHours.opensAt} - {issue.operatingHours.closesAt}
              </p>
            )}
          </div>
        </div>
        {onFindAlternative && (
          <Button
            variant="ghost"
            size="chipTiny"
            className="shrink-0 bg-sage/20 text-sage hover:bg-sage/30"
            onClick={onFindAlternative}
          >
            Find alternative
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact inline availability status for activity rows
 */
export type InlineAvailabilityStatusProps = {
  status: "open" | "closed" | "busy" | "requires_reservation" | "unknown";
  message?: string;
  operatingHours?: {
    opensAt: string;
    closesAt: string;
  };
  className?: string;
};

export function InlineAvailabilityStatus({
  status,
  message,
  operatingHours,
  className,
}: InlineAvailabilityStatusProps) {
  if (status === "open" || status === "unknown") {
    // Only show operating hours for open status
    if (status === "open" && operatingHours) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success",
            className
          )}
        >
          Open <span className="font-mono">{operatingHours.opensAt}-{operatingHours.closesAt}</span>
        </span>
      );
    }
    return null;
  }

  const statusConfig = {
    closed: {
      bg: "bg-error/10",
      text: "text-error",
      Icon: AlertTriangle,
      label: "Closed",
    },
    busy: {
      bg: "bg-warning/10",
      text: "text-warning",
      Icon: Clock,
      label: "Busy",
    },
    requires_reservation: {
      bg: "bg-warning/10",
      text: "text-warning",
      Icon: Phone,
      label: "Reservation recommended",
    },
  };

  const config = statusConfig[status];

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
          config.bg,
          config.text
        )}
      >
        <config.Icon className="h-3 w-3" aria-hidden="true" />
        {config.label}
      </span>
      {operatingHours && (
        <span className="font-mono text-[11px] text-stone">
          Hours: {operatingHours.opensAt}-{operatingHours.closesAt}
        </span>
      )}
      {message && !operatingHours && (
        <span className="text-[11px] text-foreground-secondary">
          {message}
        </span>
      )}
    </div>
  );
}
