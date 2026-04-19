"use client";

type Props = {
  index: number;
  onClick: (index: number) => void;
  /**
   * Positional accessible name, e.g. "Add a place before Tsukiji Hongwanji",
   * "Add a place between X and Y", or "Add a place at the end of day 1".
   * Falls back to "Add a place" if omitted.
   */
  ariaLabel?: string;
};

export function AddActivityButton({ index, onClick, ariaLabel }: Props) {
  return (
    <div className="py-1">
      <button
        type="button"
        aria-label={ariaLabel ?? "Add a place"}
        onClick={() => onClick(index)}
        className="flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-transparent px-3 py-2.5 text-xs text-stone transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary active:bg-orange-50"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Add a place</span>
      </button>
    </div>
  );
}
