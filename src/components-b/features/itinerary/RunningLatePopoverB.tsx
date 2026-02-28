"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type RunningLatePopoverBProps = {
  onApplyDelay: (delayMinutes: number) => void;
};

const PRESETS = [
  { label: "+15 min", value: 15 },
  { label: "+30 min", value: 30 },
  { label: "+1 hr", value: 60 },
];

export function RunningLatePopoverB({ onApplyDelay }: RunningLatePopoverBProps) {
  const [open, setOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const applyPreset = useCallback(
    (minutes: number) => {
      onApplyDelay(minutes);
      setOpen(false);
    },
    [onApplyDelay],
  );

  const applyCustom = useCallback(() => {
    const parsed = parseInt(customMinutes, 10);
    if (!parsed || parsed < 1 || parsed > 180) return;
    onApplyDelay(parsed);
    setCustomMinutes("");
    setOpen(false);
  }, [customMinutes, onApplyDelay]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs transition-colors hover:text-[var(--foreground)] hover:underline"
        style={{ color: "var(--muted-foreground)" }}
      >
        Running late?
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-30 mt-1.5 w-52 rounded-2xl border p-3"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            Shift remaining activities
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => applyPreset(preset.value)}
                className="min-h-[44px] rounded-xl bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors active:scale-[0.98] hover:bg-[var(--surface)]"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={180}
              placeholder="min"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyCustom()}
              className="h-11 w-20 rounded-xl border px-2 text-center text-base focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
              }}
            />
            <button
              type="button"
              onClick={applyCustom}
              disabled={!customMinutes || parseInt(customMinutes, 10) < 1}
              className="min-h-[44px] rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-4 py-2.5 text-sm font-medium text-[var(--primary)] transition-colors active:scale-[0.98] hover:bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
