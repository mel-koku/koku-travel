"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { ItineraryDay } from "@/types/itinerary";
import { useDayTips } from "./useDayTips";

type DayTipsBProps = {
  day: ItineraryDay;
  tripStartDate?: string;
  dayIndex: number;
  className?: string;
  nextDayActivities?: ItineraryDay["activities"];
  isFirstTimeVisitor?: boolean;
};

export function DayTipsB({ day, tripStartDate, dayIndex, className, nextDayActivities, isFirstTimeVisitor }: DayTipsBProps) {
  const { tips: allTips, isLoading } = useDayTips(day, tripStartDate, dayIndex, { nextDayActivities, isFirstTimeVisitor });
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTipId, setExpandedTipId] = useState<string | null>(null);

  if (!isLoading && allTips.length === 0) return null;

  return (
    <div
      className={`overflow-hidden rounded-2xl ${className ?? ""}`}
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[var(--surface)]"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
          >
            <span className="text-sm">{"\uD83C\uDDEF\uD83C\uDDF5"}</span>
          </div>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Travel Tips
          </span>
          {!isLoading && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{
                backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
              }}
            >
              {allTips.length}
            </span>
          )}
        </div>
        <ChevronDown
          className="h-4 w-4 transition-transform duration-200"
          style={{
            color: "var(--muted-foreground)",
            transform: isExpanded ? "rotate(180deg)" : undefined,
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div
              className="border-t px-4 pb-4"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="mt-3 space-y-2">
                {isLoading ? (
                  <p
                    className="py-2 text-center text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Loading tips...
                  </p>
                ) : (
                  allTips.map((tip) => (
                    <div
                      key={tip.id}
                      className={`flex items-start gap-2.5 rounded-xl p-2.5${tip.content ? " cursor-pointer" : ""}`}
                      style={{ backgroundColor: "var(--surface)" }}
                      onClick={tip.content ? () => setExpandedTipId(expandedTipId === tip.id ? null : tip.id) : undefined}
                    >
                      <span className="shrink-0 text-base">{tip.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-semibold"
                          style={{ color: "var(--foreground)" }}
                        >
                          {tip.title}
                        </p>
                        <p
                          className="mt-0.5 text-xs leading-relaxed"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {tip.summary}
                        </p>
                        {tip.content && expandedTipId === tip.id && (
                          <p
                            className="mt-1.5 border-t pt-1.5 text-xs leading-relaxed"
                            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", opacity: 0.8 }}
                          >
                            {tip.content}
                          </p>
                        )}
                      </div>
                      {tip.content && (
                        <ChevronDown
                          className="mt-0.5 h-3 w-3 shrink-0 transition-transform"
                          style={{
                            color: "var(--muted-foreground)",
                            opacity: 0.5,
                            transform: expandedTipId === tip.id ? "rotate(180deg)" : undefined,
                          }}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
