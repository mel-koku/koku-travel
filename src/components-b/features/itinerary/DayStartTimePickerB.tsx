"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Clock, ChevronDown } from "lucide-react";

const DAY_START_OPTIONS = [
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
] as const;

type DayStartTimePickerBProps = {
  currentTime: string;
  onChange: (time: string) => void;
};

function formatTime(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;
  const hours = Number.parseInt(match[1] || "0", 10);
  const minutes = match[2] || "00";
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hour12}:${minutes} ${period}`;
}

export function DayStartTimePickerB({ currentTime, onChange }: DayStartTimePickerBProps) {
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
        className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Clock className="h-4 w-4" style={{ color: "var(--primary)" }} />
        <span className="font-medium">
          Starts{" "}
          <span style={{ color: "var(--foreground)" }}>{currentLabel}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-30 mt-1 w-40 rounded-xl border p-1"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          {DAY_START_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className="w-full rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
              style={{
                backgroundColor:
                  currentTime === option.value
                    ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                    : "transparent",
                color:
                  currentTime === option.value
                    ? "var(--primary)"
                    : "var(--foreground)",
                fontWeight: currentTime === option.value ? 600 : 400,
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
