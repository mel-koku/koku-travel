"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

export type PreferenceCardProps = {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
  optional?: boolean;
  info?: string;
  /** Show a "Set" badge when collapsed and user has entered a value */
  hasValue?: boolean;
  /** Summary text shown in the collapsed badge (e.g. "¥15,000/day") */
  summary?: string;
};

/**
 * Collapsible preference card — collapsed by default.
 * Used in the preferences section of the Review step.
 */
export function PreferenceCard({
  icon,
  title,
  children,
  className,
  optional,
  hasValue = false,
  summary,
}: PreferenceCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-surface",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-primary/5"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-foreground-secondary">
          {icon}
        </div>
        <h4 className="flex-1 text-sm font-medium text-foreground">
          {title}
        </h4>
        {hasValue && !isOpen && (
          <span className="flex items-center gap-1.5 text-xs text-brand-primary">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            {summary || "Set"}
          </span>
        )}
        {!hasValue && !isOpen && optional && (
          <span className="text-xs text-stone">Optional</span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-stone transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 px-4 pt-1 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
