"use client";

export type InlineDayNoteKind = "safety" | "closure";

export type InlineDayNoteEntry = {
  kind: InlineDayNoteKind;
  label: string;
};

export type InlineDayNoteProps = {
  notes: InlineDayNoteEntry[];
  onReview: () => void;
};

export function InlineDayNote({ notes, onReview }: InlineDayNoteProps) {
  if (notes.length === 0) return null;
  const label =
    notes.length === 1
      ? notes[0]!.label
      : `${notes.length} advisories for today`;
  return (
    <div className="inline-flex items-center gap-2 mt-5 mb-1 px-3 py-2 rounded-md bg-yuzu-tint text-sm text-foreground">
      <span aria-hidden className="text-warning text-xs">◈</span>
      <span>{label}</span>
      <button
        type="button"
        onClick={onReview}
        className="text-accent underline underline-offset-2 text-sm"
      >
        Review ↗
      </button>
    </div>
  );
}
