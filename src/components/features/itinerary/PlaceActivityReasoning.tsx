import { useState, type MouseEvent } from "react";
import type { ItineraryActivity } from "@/types/itinerary";

type PlaceActivityReasoningProps = {
  recommendationReason: NonNullable<Extract<ItineraryActivity, { kind: "place" }>["recommendationReason"]>;
  onReplace?: () => void;
};

/**
 * "Why this place?" section showing scoring factors and alternative candidates.
 */
export function PlaceActivityReasoning({
  recommendationReason,
  onReplace,
}: PlaceActivityReasoningProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={(event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          setReasoningOpen((prev) => !prev);
        }}
        className="flex w-full items-center justify-between text-left text-xs font-medium text-sage hover:text-sage/80"
      >
        <span>
          Why this place?
          {recommendationReason.alternativesConsidered &&
            recommendationReason.alternativesConsidered.length > 0 && (
              <span className="ml-1.5 text-[10px] font-normal text-stone">
                ({recommendationReason.alternativesConsidered.length} alternatives considered)
              </span>
            )}
        </span>
        <svg className={`h-4 w-4 transition-transform ${reasoningOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {reasoningOpen && (
        <div className="mt-2 rounded-lg bg-surface/70 p-2 text-xs text-foreground-secondary">
          <p className="font-medium">{recommendationReason.primaryReason}</p>
          {recommendationReason.factors && recommendationReason.factors.length > 0 && (
            <ul className="mt-1.5 space-y-1 pl-1">
              {recommendationReason.factors.map((factor, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                  <span
                    className={`shrink-0 font-mono text-[10px] ${
                      factor.score > 0
                        ? "text-sage"
                        : factor.score < 0
                          ? "text-terracotta"
                          : "text-stone"
                    }`}
                  >
                    {factor.score > 0 ? "+" : ""}{factor.score}
                  </span>
                  <span
                    className={
                      factor.score > 0
                        ? "text-foreground-secondary"
                        : factor.score < 0
                          ? "text-foreground-secondary/70"
                          : "text-stone"
                    }
                  >
                    <span className="font-medium">{factor.factor}</span>
                    {factor.reasoning && ` — ${factor.reasoning}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {/* Alternatives considered */}
          {recommendationReason.alternativesConsidered &&
            recommendationReason.alternativesConsidered.length > 0 && (
              <div className="mt-2 border-t border-border/30 pt-2">
                <p className="text-[10px] font-medium text-stone">Also considered:</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {recommendationReason.alternativesConsidered.map((alt) => (
                    <button
                      key={alt}
                      type="button"
                      onClick={(event: MouseEvent) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onReplace?.();
                      }}
                      className="rounded-lg border border-border/50 bg-surface/50 px-2 py-0.5 text-[10px] text-foreground-secondary transition hover:border-brand-primary/30 hover:text-brand-primary"
                    >
                      {alt}
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
