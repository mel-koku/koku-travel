"use client";

import { useCallback, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import * as Popover from "@radix-ui/react-popover";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

import { FormField } from "./FormField";

export type DatePickerProps = {
  id: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  help?: string;
  className?: string;
  inputClassName?: string;
};

/** Parse "YYYY-MM-DD" → Date (local) or undefined */
function parseDate(str?: string): Date | undefined {
  if (!str) return undefined;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/** Format Date → "YYYY-MM-DD" */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePicker({
  id,
  label,
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  error,
  help,
  className,
  inputClassName,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => parseDate(value), [value]);
  const fromDate = useMemo(() => parseDate(min), [min]);
  const toDate = useMemo(() => parseDate(max), [max]);

  const handleSelect = useCallback(
    (day: Date | undefined) => {
      if (!day) return;
      onChange(formatDate(day));
      setOpen(false);
    },
    [onChange],
  );

  const displayValue = useMemo(() => {
    if (!selected) return "";
    return format(selected, "MMM d, yyyy");
  }, [selected]);

  return (
    <FormField
      id={id}
      label={label}
      required={required}
      help={help}
      error={error}
      className={className}
    >
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-required={required}
            className={cn(
              "flex h-12 w-full items-center rounded-md border border-input bg-transparent px-4 text-left text-base shadow-[var(--shadow-sm)] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus-visible:ring-destructive",
              !selected && "text-muted-foreground",
              inputClassName,
            )}
          >
            <span className="flex-1 truncate">
              {displayValue || "Select a date"}
            </span>
            <CalendarIcon className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className={cn(
              "z-50 rounded-lg border border-border bg-popover p-3 shadow-[var(--shadow-elevated)]",
              "animate-in fade-in-0 zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            )}
          >
            <DayPicker
              mode="single"
              weekStartsOn={0}
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected ?? fromDate ?? new Date()}
              disabled={[
                ...(fromDate ? [{ before: fromDate }] : []),
                ...(toDate ? [{ after: toDate }] : []),
              ]}
              showOutsideDays
              classNames={{
                months: "flex flex-col",
                month: "space-y-3",
                month_caption: "flex items-center justify-center pt-1 relative",
                caption_label: "text-sm font-medium text-popover-foreground",
                nav: "flex items-center gap-1",
                button_previous: cn(
                  "absolute left-0 inline-flex h-8 w-8 items-center justify-center rounded-lg",
                  "text-popover-foreground/70 hover:bg-muted hover:text-popover-foreground",
                  "transition-colors",
                ),
                button_next: cn(
                  "absolute right-0 inline-flex h-8 w-8 items-center justify-center rounded-lg",
                  "text-popover-foreground/70 hover:bg-muted hover:text-popover-foreground",
                  "transition-colors",
                ),
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday:
                  "w-9 text-[0.7rem] font-medium text-muted-foreground text-center",
                week: "flex mt-1",
                day: "relative w-9 p-0 text-center text-sm focus-within:relative",
                day_button: cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                  "text-popover-foreground text-sm",
                  "hover:bg-muted transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                ),
                selected:
                  "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:font-semibold",
                today:
                  "[&>button]:border [&>button]:border-primary/40",
                outside: "[&>button]:opacity-40",
                disabled:
                  "opacity-30 pointer-events-none",
                hidden: "invisible",
              }}
              components={{
                MonthCaption: ({ calendarMonth, displayIndex, ...props }) => (
                  <div {...props} aria-live="polite" aria-atomic="true">
                    {format(calendarMonth.date, "MMMM yyyy")}
                  </div>
                ),
                Chevron: ({ orientation }) =>
                  orientation === "left" ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  ),
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </FormField>
  );
}
