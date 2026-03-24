"use client";

import { useCallback, useMemo } from "react";
import { Dropdown } from "@/components/ui/Dropdown";

const DAY_START_OPTIONS = [
  { value: "08:00", label: "08:00" },
  { value: "09:00", label: "09:00" },
  { value: "10:00", label: "10:00" },
  { value: "11:00", label: "11:00" },
] as const;

type DayStartTimePickerProps = {
  currentTime: string;
  onChange: (time: string) => void;
};

/**
 * Formats a time string to 24-hour display (e.g., "09:00")
 */
function formatTime(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;
  const hours = Number.parseInt(match[1] || "0", 10);
  const minutes = match[2] || "00";
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

export function DayStartTimePicker({ currentTime, onChange }: DayStartTimePickerProps) {
  const dropdownItems = useMemo(
    () =>
      DAY_START_OPTIONS.map((option) => ({
        id: option.value,
        label: option.label,
        onSelect: () => onChange(option.value),
      })),
    [onChange]
  );

  const currentLabel = useMemo(() => {
    const option = DAY_START_OPTIONS.find((opt) => opt.value === currentTime);
    return option?.label ?? formatTime(currentTime);
  }, [currentTime]);

  const triggerLabel = useCallback(
    () => (
      <span className="flex items-center gap-1.5 text-sm text-foreground-secondary">
        <svg
          className="h-4 w-4 text-sage"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="font-medium">
          Starts <span className="font-mono text-foreground">{currentLabel}</span>
        </span>
      </span>
    ),
    [currentLabel]
  );

  return (
    <Dropdown
      label={triggerLabel()}
      items={dropdownItems}
      align="start"
      triggerClassName="!bg-transparent !px-2 !py-1 hover:!bg-sage/10 !rounded-lg"
      menuClassName="w-40"
    />
  );
}
