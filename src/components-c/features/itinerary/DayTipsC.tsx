"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cEase } from "@c/ui/motionC";
import type { ItineraryDay } from "@/types/itinerary";
import { useDayTips } from "@b/features/itinerary/useDayTips";

type DayTipsCProps = {
  day: ItineraryDay;
  tripStartDate?: string;
  dayIndex: number;
  className?: string;
  nextDayActivities?: ItineraryDay["activities"];
  isFirstTimeVisitor?: boolean;
};

export function DayTipsC({
  day,
  tripStartDate,
  dayIndex,
  className,
  nextDayActivities,
  isFirstTimeVisitor,
}: DayTipsCProps) {
  const { tips: allTips, isLoading } = useDayTips(day, tripStartDate, dayIndex, {
    nextDayActivities,
    isFirstTimeVisitor,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTipId, setExpandedTipId] = useState<string | null>(null);

  if (!isLoading && allTips.length === 0) return null;

  return (
    <div
      className={`overflow-hidden border ${className ?? ""}`}
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--card)",
      }}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm">{"\uD83C\uDDEF\uD83C\uDDF5"}</span>
          <span
            className="text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{ color: "var(--foreground)" }}
          >
            Travel Tips
          </span>
          {!isLoading && (
            <span
              className="border px-2 py-0.5 text-[10px] font-bold"
              style={{
                borderColor: "var(--primary)",
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
            transition={{ duration: 0.2, ease: cEase }}
            className="overflow-hidden"
          >
            <div
              className="border-t px-4 pb-4"
              style={{ borderColor: "var(--border)" }}
            >
              {isLoading ? (
                <div
                  className="py-4 text-center text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Loading tips...
                </div>
              ) : (
                <div className="space-y-0">
                  {allTips.map((tip) => (
                    <div
                      key={tip.id}
                      className="border-b py-3 last:border-b-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTipId(expandedTipId === tip.id ? null : tip.id)
                        }
                        className="flex w-full items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{tip.icon}</span>
                          <span
                            className="text-xs font-bold"
                            style={{ color: "var(--foreground)" }}
                          >
                            {tip.title}
                          </span>
                        </div>
                        <ChevronDown
                          className="h-3 w-3 transition-transform"
                          style={{
                            color: "var(--muted-foreground)",
                            transform:
                              expandedTipId === tip.id
                                ? "rotate(180deg)"
                                : undefined,
                          }}
                        />
                      </button>
                      <AnimatePresence>
                        {expandedTipId === tip.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15, ease: cEase }}
                            className="overflow-hidden"
                          >
                            <p
                              className="mt-2 pl-7 text-xs leading-relaxed"
                              style={{ color: "var(--muted-foreground)" }}
                            >
                              {tip.content}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
