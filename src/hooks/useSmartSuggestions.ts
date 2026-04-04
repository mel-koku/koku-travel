import { useCallback, useMemo } from "react";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";
import type { ItineraryDay } from "@/types/itinerary";
import type { AcceptGapResult } from "@/hooks/useSmartPromptActions";

type UseSmartSuggestionsParams = {
  suggestions?: DetectedGap[];
  currentDay: ItineraryDay | undefined;
  safeSelectedDay: number;
  onAcceptSuggestion?: (gap: DetectedGap) => Promise<AcceptGapResult>;
  setIsPlanning: (v: boolean) => void;
};

export function useSmartSuggestions({
  suggestions,
  currentDay,
  safeSelectedDay,
  onAcceptSuggestion,
  setIsPlanning,
}: UseSmartSuggestionsParams) {
  const currentDaySuggestions = useMemo(() => {
    if (!suggestions || !currentDay) return [];
    return suggestions.filter((gap) => gap.dayIndex === safeSelectedDay);
  }, [suggestions, currentDay, safeSelectedDay]);

  const handleAcceptSuggestion = useCallback(
    async (gap: DetectedGap) => {
      if (!onAcceptSuggestion) return;

      const result = await onAcceptSuggestion(gap);

      if (result.success) {
        setIsPlanning(true);
      }
    },
    [onAcceptSuggestion, setIsPlanning],
  );

  return { currentDaySuggestions, handleAcceptSuggestion };
}
