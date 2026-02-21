import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Manages scroll-linked activity highlighting via IntersectionObserver.
 * Observes activity cards inside `[data-itinerary-activities]` and sets
 * `selectedActivityId` to the most visible card.
 *
 * Also provides `handleSelectActivity` for explicit user selection
 * (map pin click, card click) with observer suppression to prevent racing.
 */
export function useItineraryScrollSync(safeSelectedDay: number) {
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  // Suppression flag: when true, IntersectionObserver won't override selectedActivityId.
  // This prevents the observer from racing against programmatic scrollIntoView after
  // an explicit user action (map pin click, card click).
  const suppressObserverRef = useRef(false);

  // Keep selectedActivityId in a ref so the IntersectionObserver callback can read it
  // without causing the effect to re-run (which would destroy/recreate the observer).
  const selectedActivityIdRef = useRef(selectedActivityId);
  useEffect(() => {
    selectedActivityIdRef.current = selectedActivityId;
  }, [selectedActivityId]);

  // Scroll-linked map panning: observe activity cards in the timeline.
  // Only re-runs when the day changes — callback reads selectedActivityId from ref.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const activityListEl = document.querySelector("[data-itinerary-activities]");
    if (!activityListEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Skip if an explicit selection is in progress (scrollIntoView still animating)
        if (suppressObserverRef.current) return;

        // Find the most visible activity card
        let bestEntry: IntersectionObserverEntry | null = null;
        let bestRatio = 0;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestEntry = entry;
          }
        }
        if (bestEntry?.target) {
          const activityId = (bestEntry.target as HTMLElement).dataset.activityId;
          if (activityId && activityId !== selectedActivityIdRef.current) {
            setSelectedActivityId(activityId);
          }
        }
      },
      {
        root: activityListEl,
        threshold: [0.3, 0.5, 0.8],
      },
    );

    const activityCards = activityListEl.querySelectorAll("[data-activity-id]");
    activityCards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [safeSelectedDay]);

  const handleSelectActivity = useCallback((activityId: string | null) => {
    setSelectedActivityId(activityId);
    if (!activityId) return;

    // Suppress IntersectionObserver during programmatic scroll so it doesn't
    // immediately override the selection with whichever card is currently visible.
    suppressObserverRef.current = true;
    setTimeout(() => {
      suppressObserverRef.current = false;
    }, 1000);

    window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(
        `[data-activity-id="${activityId}"]`,
      );
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.focus({ preventScroll: true });
    });
  }, []);

  return { selectedActivityId, setSelectedActivityId, handleSelectActivity };
}
