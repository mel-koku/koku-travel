"use client";

export type LaunchNudgeProps = {
  onDismiss: () => void;
};

export function LaunchNudge({ onDismiss }: LaunchNudgeProps) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 px-4 py-2.5 rounded-md bg-yuzu-tint text-sm text-foreground"
    >
      <span aria-hidden className="text-warning">◈</span>
      <span className="flex-1">Trip advisories moved here ↗</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-xs text-accent underline underline-offset-2"
      >
        Got it
      </button>
    </div>
  );
}
