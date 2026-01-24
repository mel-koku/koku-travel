"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Checkbox } from "@/components/ui/Checkbox";

type CategoryCheckboxDropdownProps = {
  label: string;
  options: readonly { value: string; label: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

export function CategoryCheckboxDropdown({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "All categories",
}: CategoryCheckboxDropdownProps) {
  const triggerId = useId();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current?.contains(event.target as Node) ||
        triggerRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const displayText =
    selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
        ? options.find((opt) => opt.value === selectedValues[0])?.label ?? placeholder
        : `${selectedValues.length} selected`;

  return (
    <label className="flex flex-col gap-1 text-sm text-warm-gray lg:gap-2">
      <span className="font-medium lg:text-base">{label}</span>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={triggerId}
          className={cn(
            "w-full appearance-none rounded-full border border-border bg-background py-2 pl-4 pr-11 text-left text-sm text-charcoal shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/50 lg:py-3 lg:text-base",
            selectedValues.length > 0 && "font-medium",
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((prev) => !prev)}
        >
          {displayText}
        </button>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-stone">
          <svg
            className={cn("h-4 w-4 transform transition-transform", open && "rotate-180")}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>

        {open && (
          <div
            ref={menuRef}
            id={menuId}
            role="listbox"
            aria-labelledby={triggerId}
            className="absolute z-50 mt-2 w-full rounded-2xl border border-border bg-background p-2 shadow-lg ring-1 ring-black/5 focus:outline-none max-h-80 overflow-y-auto"
            tabIndex={-1}
          >
            <div className="py-1 space-y-1">
              {options.map((option) => {
                const isChecked = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isChecked}
                    className="rounded-xl transition hover:bg-sand"
                  >
                    <Checkbox
                      label={option.label}
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggle(option.value);
                      }}
                      containerClassName="border-0 px-3 py-2 min-h-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </label>
  );
}

