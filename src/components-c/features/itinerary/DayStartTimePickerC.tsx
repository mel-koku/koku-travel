"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Clock, ChevronDown } from "lucide-react";

const DAY_START_OPTIONS = [
  { value: "08:00", label: "08:00" },
  { value: "09:00", label: "09:00" },
  { value: "10:00", label: "10:00" },
  { value: "11:00", label: "11:00" },
] as const;

type DayStartTimePickerCProps = {
  currentTime: string;
  onChange: (time: string) => void;
};

function formatTime(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;
  const hours = Number.parseInt(match[1] || "0", 10);
  const minutes = match[2] || "00";
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

export function DayStartTimePickerC({ currentTime, onChange }: DayStartTimePickerCProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentLabel =
    DAY_START_OPTIONS.find((opt) => opt.value === currentTime)?.label ??
    formatTime(currentTime);

  const handleSelect = useCallback(
    (value: string) => {
      onChange(value);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] active:scale-[0.98]"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Clock className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
        <span className="text-xs font-bold uppercase tracking-[0.1em]">
          {currentLabel}
        </span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-36 border p-1"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
          }}
        >
          {DAY_START_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className="w-full px-3 py-2 text-left text-sm transition-colors active:scale-[0.98]"
              style={{
                backgroundColor:
                  currentTime === option.value
                    ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                    : "transparent",
                color:
                  currentTime === option.value
                    ? "var(--primary)"
                    : "var(--foreground)",
                fontWeight: currentTime === option.value ? 700 : 400,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
