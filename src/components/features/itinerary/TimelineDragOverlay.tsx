import { memo } from "react";
import { DragOverlay } from "@dnd-kit/core";
import type { ItineraryActivity } from "@/types/itinerary";
import { easeCinematicCSS } from "@/lib/motion";

type TimelineDragOverlayProps = {
  activeActivity: ItineraryActivity | null | undefined;
};

export const TimelineDragOverlay = memo(function TimelineDragOverlay({
  activeActivity,
}: TimelineDragOverlayProps) {
  return (
    <DragOverlay dropAnimation={{ duration: 250, easing: easeCinematicCSS }}>
      {activeActivity && activeActivity.kind === "place" && (
        <div className="pointer-events-none w-[320px] max-w-[90vw]">
          <div className="rounded-lg border-2 border-brand-primary/50 bg-background p-3 shadow-[var(--shadow-elevated)] ring-4 ring-brand-primary/20 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {/* Drag indicator */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10">
                <svg className="h-5 w-5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
              {/* Activity info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {activeActivity.title}
                </p>
                <div className="flex items-center gap-2">
                  {activeActivity.schedule?.arrivalTime && (
                    <span className="font-mono text-xs text-sage">
                      {activeActivity.schedule.arrivalTime}
                    </span>
                  )}
                  {activeActivity.neighborhood && (
                    <span className="truncate text-xs text-stone">
                      {activeActivity.neighborhood}
                    </span>
                  )}
                </div>
              </div>
              {/* Visual indicator that it's being dragged */}
              <div className="shrink-0 rounded-full bg-sage/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sage">
                Moving
              </div>
            </div>
          </div>
        </div>
      )}
    </DragOverlay>
  );
});
