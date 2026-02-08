"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type PreferenceRowProps = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description?: string;
  value?: string | React.ReactNode;
  isSet: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
};

/**
 * Expandable preference row with inline edit capability.
 */
export function PreferenceRow({
  id,
  icon,
  title,
  description,
  value,
  isSet,
  defaultExpanded = false,
  children,
}: PreferenceRowProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div
      className={cn(
        "rounded-xl border bg-background transition-all duration-200",
        isExpanded
          ? "border-brand-primary/30 shadow-sm"
          : isSet
            ? "border-sage/30"
            : "border-border"
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-surface/50"
        aria-expanded={isExpanded}
        aria-controls={`${id}-content`}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              isSet ? "bg-sage/20 text-sage" : "bg-surface text-stone"
            )}
          >
            {isSet && !isExpanded ? (
              <Check className="h-4 w-4" />
            ) : (
              icon
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            {!isExpanded && value && (
              <p className="mt-0.5 text-xs text-stone">{value}</p>
            )}
            {!isExpanded && !value && description && (
              <p className="mt-0.5 text-xs text-stone">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isExpanded && isSet && (
            <span className="rounded-full bg-sage/10 px-2 py-0.5 text-xs font-medium text-sage">
              Set
            </span>
          )}
          <div className="text-stone">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </div>
      </button>

      {/* Content */}
      <div
        id={`${id}-content`}
        className={cn(
          "overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="border-t border-border px-4 pb-4 pt-4">{children}</div>
      </div>
    </div>
  );
}
