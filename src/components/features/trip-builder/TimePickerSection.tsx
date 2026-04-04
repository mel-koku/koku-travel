"use client";

import { Clock } from "lucide-react";
import { TimePicker } from "@/components/ui/TimePicker";

export type TimePickerSectionProps = {
  label: string;
  value: string | undefined;
  onChange: (time: string | undefined) => void;
  onClear: () => void;
  accent: "sage" | "brand-primary";
  hint?: string | null;
  hintPrefix?: string;
  hintColorClass?: string;
};

export function TimePickerSection({
  label,
  value,
  onChange,
  onClear,
  accent,
  hint,
  hintPrefix,
  hintColorClass = "text-sage",
}: TimePickerSectionProps) {
  return (
    <>
      <div className="flex items-center gap-3">
        <Clock className="h-4 w-4 shrink-0 text-stone" />
        <div className="flex flex-1 items-center gap-2">
          <label className="text-xs text-stone whitespace-nowrap">{label}</label>
          <TimePicker
            value={value}
            onChange={onChange}
            accent={accent}
            placeholder="Set time"
          />
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-stone hover:text-foreground-secondary"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {hint && (
        <p className={`mt-1.5 pl-7 text-xs ${hintColorClass}`}>
          {hintPrefix}{hint}
        </p>
      )}
    </>
  );
}
