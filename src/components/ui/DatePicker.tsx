"use client";

import { useCallback, useMemo, useState } from "react";
import { DayPicker, useDayPicker } from "react-day-picker";
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

const navButtonClassName = cn(
  "inline-flex h-10 w-10 items-center justify-center rounded-lg",
  "text-popover-foreground/70 hover:bg-muted hover:text-popover-foreground",
  "transition-colors",
  "disabled:opacity-30 disabled:pointer-events-none",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

function MonthCaptionWithNav({
  calendarMonth,
}: {
  calendarMonth: { date: Date };
}) {
  const { goToMonth, previousMonth, nextMonth } = useDayPicker();

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        aria-label="Go to previous month"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        className={navButtonClassName}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        className="text-sm font-medium text-popover-foreground"
        aria-live="polite"
        aria-atomic="true"
      >
        {format(calendarMonth.date, "MMMM yyyy")}
      </div>
      <button
        type="button"
        aria-label="Go to next month"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        className={navButtonClassName}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
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
            // WAI-ARIA combobox-datepicker pattern: the trigger is a combobox
            // that opens a dialog-style popover. role="combobox" supports
            // aria-required (unlike role="button"), and aria-expanded +
            // aria-haspopup + aria-controls give screen readers the full
            // "what does this do" picture on focus.
            // Ref: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-datepicker/
            role="combobox"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={`${id}-popover`}
            aria-required={required}
            aria-invalid={error ? true : undefined}
            disabled={disabled}
            onKeyDown={(e) => {
              // Radix opens on Enter/Space by default, but ArrowDown is part of
              // the WAI-ARIA combobox pattern for opening a listbox/dialog.
              if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                e.preventDefault();
                setOpen(true);
              }
            }}
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
            id={`${id}-popover`}
            role="dialog"
            aria-label={`${label} calendar`}
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
                month_caption: "flex items-center justify-center pt-1",
                caption_label: "text-sm font-medium text-popover-foreground",
                nav: "hidden",
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
                MonthCaption: MonthCaptionWithNav,
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/*
        Live region for selected-value announcements. When the user picks a
        date inside the popover, the trigger button's label changes. Screen
        readers don't always announce that DOM update for a button; an
        explicit polite live region does. Kept visually hidden.
      */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {displayValue ? `Selected date: ${displayValue}` : ""}
      </span>
    </FormField>
  );
}
