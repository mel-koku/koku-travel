"use client";

import { useMemo } from "react";

export type AskYukuContext =
  | "places"
  | "itinerary"
  | "dashboard"
  | "trip-builder"
  | "default";

export type TimeOfDay = "morning" | "daytime" | "evening" | "any";
export type TripPhase = "planning" | "active" | "any";

export type StarterSuggestion = {
  text: string;
  timeOfDay: TimeOfDay;
  tripPhase: TripPhase;
};

const SUGGESTION_POOLS: Record<AskYukuContext, StarterSuggestion[]> = {
  places: [
    { text: "What's worth seeing that I'd walk past?", timeOfDay: "any", tripPhase: "active" },
    { text: "Show me top-rated shrines", timeOfDay: "daytime", tripPhase: "any" },
    { text: "Where should I eat in this area?", timeOfDay: "any", tripPhase: "active" },
    { text: "Find something off the usual route", timeOfDay: "daytime", tripPhase: "active" },
    { text: "Best photo spots around here?", timeOfDay: "daytime", tripPhase: "active" },
    { text: "What's open right now?", timeOfDay: "any", tripPhase: "active" },
  ],
  itinerary: [
    { text: "Is my schedule too packed?", timeOfDay: "any", tripPhase: "planning" },
    { text: "What should I eat for lunch here?", timeOfDay: "daytime", tripPhase: "active" },
    { text: "Any etiquette tips for today's stops?", timeOfDay: "any", tripPhase: "active" },
    { text: "What if it rains tomorrow?", timeOfDay: "any", tripPhase: "planning" },
    { text: "Suggest a quick coffee break", timeOfDay: "morning", tripPhase: "active" },
    { text: "How do I get between these places?", timeOfDay: "any", tripPhase: "active" },
  ],
  dashboard: [
    { text: "Compare my saved trips", timeOfDay: "any", tripPhase: "planning" },
    { text: "Plan a weekend getaway", timeOfDay: "any", tripPhase: "planning" },
    { text: "What's the best season to visit Japan?", timeOfDay: "any", tripPhase: "planning" },
    { text: "Do I need a JR Pass?", timeOfDay: "any", tripPhase: "planning" },
    { text: "Tips for first-time visitors", timeOfDay: "any", tripPhase: "planning" },
    { text: "What should I pack?", timeOfDay: "any", tripPhase: "planning" },
  ],
  "trip-builder": [
    { text: "Help me pick the right cities", timeOfDay: "any", tripPhase: "planning" },
    { text: "How many days do I need in Kyoto?", timeOfDay: "any", tripPhase: "planning" },
    { text: "Is Osaka worth adding?", timeOfDay: "any", tripPhase: "planning" },
    { text: "Best time to visit Hokkaido?", timeOfDay: "any", tripPhase: "planning" },
    { text: "Can I do Tokyo and Kyoto in 5 days?", timeOfDay: "any", tripPhase: "planning" },
    { text: "What vibes should I pick?", timeOfDay: "any", tripPhase: "planning" },
  ],
  default: [
    { text: "Best ramen spots in Tokyo?", timeOfDay: "daytime", tripPhase: "active" },
    { text: "Plan 3 days in Kyoto", timeOfDay: "any", tripPhase: "planning" },
    { text: "What's open near me right now?", timeOfDay: "any", tripPhase: "active" },
    { text: "Is it safe to walk at night?", timeOfDay: "evening", tripPhase: "any" },
    { text: "What should I pack for Japan?", timeOfDay: "any", tripPhase: "planning" },
    { text: "Surprise me in Osaka!", timeOfDay: "any", tripPhase: "active" },
    { text: "Tips for visiting temples?", timeOfDay: "daytime", tripPhase: "any" },
    { text: "Do I need a JR Pass?", timeOfDay: "any", tripPhase: "planning" },
    { text: "How do I say 'thank you'?", timeOfDay: "any", tripPhase: "planning" },
    { text: "Best spots for families in Tokyo?", timeOfDay: "daytime", tripPhase: "active" },
    { text: "What's the etiquette at onsen?", timeOfDay: "any", tripPhase: "any" },
    { text: "Do I need cash in Japan?", timeOfDay: "any", tripPhase: "planning" },
  ],
};

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) return "morning";
  if (hour >= 10 && hour < 18) return "daytime";
  if (hour >= 18 && hour < 22) return "evening";
  return "any";
}

function matchesSuggestionContext(
  suggestion: StarterSuggestion,
  currentTime: TimeOfDay,
  tripPhase: TripPhase,
): boolean {
  const timeMatches = suggestion.timeOfDay === "any" || suggestion.timeOfDay === currentTime;
  const phaseMatches = suggestion.tripPhase === "any" || suggestion.tripPhase === tripPhase;
  return timeMatches && phaseMatches;
}

function filterByContext(
  suggestions: StarterSuggestion[],
  currentTime: TimeOfDay,
  tripPhase: TripPhase,
  minCount: number,
): StarterSuggestion[] {
  // First try to get exact matches
  const exact = suggestions.filter((s) => matchesSuggestionContext(s, currentTime, tripPhase));
  if (exact.length >= minCount) {
    return exact;
  }
  // Fall back to all suggestions if we don't have enough matches
  return suggestions;
}

function shuffleSlice(pool: StarterSuggestion[], count: number): StarterSuggestion[] {
  const shuffled = [...pool];
  // Fisher-Yates partial shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, count);
}

type AskYukuSuggestionsProps = {
  onSelect: (suggestion: string) => void;
  context?: AskYukuContext;
  tripPhase?: TripPhase;
};

export function AskYukuSuggestions({
  onSelect,
  context = "default",
  tripPhase = "any",
}: AskYukuSuggestionsProps) {
  // Shuffle per mount — stable across re-renders, fresh when panel reopens
  const suggestions = useMemo(() => {
    const pool = SUGGESTION_POOLS[context] ?? SUGGESTION_POOLS.default;
    const currentTime = getTimeOfDay();
    const filtered = filterByContext(pool, currentTime, tripPhase, 6);
    return shuffleSlice(filtered, 6);
  }, [context, tripPhase]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <p className="font-serif text-lg text-foreground">
        What do you want to know?
      </p>
      <p className="mt-1 text-sm text-foreground-secondary">
        Places, tips, itineraries. I know the good stuff.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s.text}
            onClick={() => onSelect(s.text)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors hover:border-brand-primary/30 hover:text-brand-primary active:scale-[0.98]"
          >
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}
