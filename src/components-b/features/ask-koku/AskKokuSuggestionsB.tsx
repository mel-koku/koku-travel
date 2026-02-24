"use client";

import { useMemo } from "react";

export type AskKokuContext =
  | "places"
  | "itinerary"
  | "dashboard"
  | "trip-builder"
  | "default";

const SUGGESTION_POOLS: Record<AskKokuContext, string[]> = {
  places: [
    "What's the best hidden gem nearby?",
    "Show me top-rated shrines",
    "Where should I eat in this area?",
    "Find something off the beaten path",
    "Best photo spots around here?",
    "What's open right now?",
  ],
  itinerary: [
    "Is my schedule too packed?",
    "What should I eat for lunch here?",
    "Any etiquette tips for today's stops?",
    "What if it rains tomorrow?",
    "Suggest a quick coffee break",
    "How do I get between these places?",
  ],
  dashboard: [
    "Compare my saved trips",
    "Plan a weekend getaway",
    "What's the best season to visit Japan?",
    "Do I need a JR Pass?",
    "Tips for first-time visitors",
    "What should I pack?",
  ],
  "trip-builder": [
    "Help me pick the right cities",
    "How many days do I need in Kyoto?",
    "Is Osaka worth adding?",
    "Best time to visit Hokkaido?",
    "Can I do Tokyo and Kyoto in 5 days?",
    "What vibes should I pick?",
  ],
  default: [
    "Best ramen spots in Tokyo?",
    "Plan 3 days in Kyoto",
    "What's open near me right now?",
    "Is it safe to walk at night?",
    "What should I pack for Japan?",
    "Surprise me in Osaka!",
    "Tips for visiting temples?",
    "Do I need a JR Pass?",
    "How do I say 'thank you'?",
    "Best spots for families in Tokyo?",
    "What's the etiquette at onsen?",
    "Do I need cash in Japan?",
  ],
};

function shuffleSlice(pool: string[], count: number): string[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, count);
}

type AskKokuSuggestionsProps = {
  onSelect: (suggestion: string) => void;
  context?: AskKokuContext;
};

export function AskKokuSuggestionsB({
  onSelect,
  context = "default",
}: AskKokuSuggestionsProps) {
  const suggestions = useMemo(
    () => shuffleSlice(SUGGESTION_POOLS[context] ?? SUGGESTION_POOLS.default, 6),
    [context],
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <p className="text-lg font-bold text-[var(--foreground)]">
        Ask me anything about Japan
      </p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Places, tips, itineraries — I know the good stuff.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-[0.98]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
