"use client";

import { KeyboardEvent, useMemo, useRef } from "react";

type DaySelectorProps = {
  totalDays: number;
  selected: number;
  onChange: (idx: number) => void;
  labels?: string[];
};

export const DaySelector = ({
  totalDays,
  selected,
  onChange,
  labels = [],
}: DaySelectorProps) => {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const days = useMemo(() => {
    return Array.from({ length: totalDays }).map((_, index) => ({
      index,
      label: labels[index] || `Day ${index + 1}`,
    }));
  }, [labels, totalDays]);

  const focusButton = (targetIndex: number) => {
    const button = buttonRefs.current[targetIndex];
    button?.focus();
  };

  const selectDay = (index: number) => {
    onChange(index);
    focusButton(index);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = (index + 1) % days.length;
      selectDay(nextIndex);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prevIndex = (index - 1 + days.length) % days.length;
      selectDay(prevIndex);
    }
  };

  if (days.length === 0) {
    return (
      <p className="text-sm text-stone">
        No days available yet for this itinerary.
      </p>
    );
  }

  return (
    <nav aria-label="Day selector">
      <div
        role="tablist"
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap"
      >
        {days.map(({ index, label }) => {
          const isSelected = index === selected;
          return (
            <button
              key={index}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              role="tab"
              type="button"
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
                isSelected
                  ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                  : "border-border bg-background text-warm-gray hover:border-sage/30 hover:text-sage"
              }`}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => selectDay(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};


