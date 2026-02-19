"use client";

const SUGGESTION_POOL = [
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
];

// Shuffle once at module load — stable across re-renders, fresh per session
const SUGGESTIONS = [...SUGGESTION_POOL]
  .sort(() => Math.random() - 0.5)
  .slice(0, 6);

type AskKokuSuggestionsProps = {
  onSelect: (suggestion: string) => void;
};

export function AskKokuSuggestions({ onSelect }: AskKokuSuggestionsProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <p className="font-serif text-lg italic text-foreground">
        Ask me anything about Japan
      </p>
      <p className="mt-1 text-sm text-foreground-secondary">
        Places, tips, itineraries — I know the good stuff.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors hover:border-brand-primary/30 hover:text-brand-primary active:scale-[0.98]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
