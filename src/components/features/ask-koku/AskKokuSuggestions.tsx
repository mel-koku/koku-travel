"use client";

const SUGGESTIONS = [
  "Best ramen spots in Tokyo?",
  "Tips for visiting temples?",
  "Plan 3 days in Kyoto",
  "Do I need cash in Japan?",
];

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
