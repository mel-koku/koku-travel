"use client";

type GuideToggleProps = {
  enabled: boolean;
  onToggle: () => void;
};

export function GuideToggle({ enabled, onToggle }: GuideToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition ${
        enabled
          ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
          : "border-border bg-background text-foreground hover:bg-surface"
      }`}
      title={enabled ? "Hide travel guide" : "Show travel guide"}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
      Guide
    </button>
  );
}
