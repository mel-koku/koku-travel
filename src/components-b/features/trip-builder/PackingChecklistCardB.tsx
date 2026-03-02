"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  generatePackingChecklist,
  groupByCategory,
  PACKING_CATEGORY_LABELS,
  PACKING_CATEGORY_ICONS,
  type PackingCategory,
} from "@/lib/packing/packingAdvisor";
import type { CityId } from "@/types/trip";
import { VIBE_FILTER_MAP } from "@/data/vibeFilterMapping";

type PackingChecklistCardBProps = {
  duration?: number;
  cities?: CityId[];
  month?: number;
  groupType?: string;
  interests?: string[];
};

const STORAGE_KEY = "koku-packing-checked";

function loadChecked(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveChecked(checked: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]));
  } catch {
    // Ignore storage errors
  }
}

export function PackingChecklistCardB({
  duration,
  cities,
  month,
  groupType,
  interests,
}: PackingChecklistCardBProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<PackingCategory>>(new Set());

  useEffect(() => {
    setChecked(loadChecked());
  }, []);

  const checklist = useMemo(() => {
    if (!duration || !cities || cities.length === 0 || !month) return null;
    const categories = new Set<string>();
    categories.add("restaurant");
    if (interests) {
      for (const vibe of interests) {
        const mapping = VIBE_FILTER_MAP[vibe as keyof typeof VIBE_FILTER_MAP];
        if (mapping) {
          for (const cat of mapping.dbCategories) categories.add(cat);
        }
      }
    }
    if (categories.size <= 1) {
      categories.add("temple").add("shrine").add("nature").add("market");
    }
    return generatePackingChecklist({
      duration,
      cities,
      activityCategories: categories,
      month,
      groupType,
    });
  }, [duration, cities, month, groupType, interests]);

  const grouped = useMemo(() => {
    if (!checklist) return null;
    return groupByCategory(checklist.items);
  }, [checklist]);

  const toggleCheck = useCallback((itemId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      saveChecked(next);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((category: PackingCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  if (!grouped || grouped.size === 0) return null;

  const totalItems = checklist?.items.length ?? 0;
  const checkedCount = checklist?.items.filter((i) => checked.has(i.id)).length ?? 0;

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Packing Checklist
          </h4>
          <p
            className="text-[10px] uppercase tracking-[0.15em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            {checkedCount}/{totalItems} packed
          </p>
        </div>
        <div
          className="h-2 w-24 overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--border)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%`,
              backgroundColor: "var(--success)",
            }}
          />
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {[...grouped.entries()].map(([category, items]) => {
          const isExpanded = expandedCategories.has(category);
          const categoryChecked = items.filter((i) => checked.has(i.id)).length;

          return (
            <div key={category}>
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors"
                style={{ color: "var(--foreground)" }}
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  <span>{PACKING_CATEGORY_ICONS[category]}</span>
                  {PACKING_CATEGORY_LABELS[category]}
                  <span style={{ color: "var(--muted-foreground)" }}>
                    ({categoryChecked}/{items.length})
                  </span>
                </span>
                <ChevronDown
                  className="h-3.5 w-3.5 transition-transform"
                  style={{
                    color: "var(--muted-foreground)",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>

              {isExpanded && (
                <div className="ml-6 space-y-0.5 pb-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleCheck(item.id)}
                      className="flex w-full items-start gap-2 rounded px-1.5 py-1 text-left"
                    >
                      <div
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                        style={{
                          borderColor: checked.has(item.id) ? "var(--success)" : "var(--border)",
                          backgroundColor: checked.has(item.id) ? "var(--success)" : "transparent",
                          color: checked.has(item.id) ? "white" : "transparent",
                        }}
                      >
                        {checked.has(item.id) && <Check className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0">
                        <span
                          className="text-xs"
                          style={{
                            color: checked.has(item.id) ? "var(--muted-foreground)" : "var(--foreground)",
                            textDecoration: checked.has(item.id) ? "line-through" : "none",
                          }}
                        >
                          {item.name}
                        </span>
                        <p
                          className="text-[10px]"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {item.reason}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
