"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  generatePackingChecklist,
  groupByCategory,
  PACKING_CATEGORY_LABELS,
  PACKING_CATEGORY_ICONS,
  type PackingCategory,
} from "@/lib/packing/packingAdvisor";
import type { CityId } from "@/types/trip";
import { VIBE_FILTER_MAP } from "@/data/vibeFilterMapping";

type PackingChecklistCardProps = {
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

export function PackingChecklistCard({
  duration,
  cities,
  month,
  groupType,
  interests,
}: PackingChecklistCardProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<PackingCategory>>(new Set());

  // Load from localStorage on mount
  useEffect(() => {
    setChecked(loadChecked());
  }, []);

  const checklist = useMemo(() => {
    if (!duration || !cities || cities.length === 0 || !month) return null;
    // Derive activity categories from selected vibes
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
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div>
          <h4 className="text-sm font-medium text-foreground">Packing Checklist</h4>
          <p className="text-[10px] uppercase tracking-[0.15em] text-stone">
            {checkedCount}/{totalItems} packed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-sage transition-all"
              style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
            />
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-stone transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {isOpen && <div className="space-y-1 px-4 pb-4">
        {[...grouped.entries()].map(([category, items]) => {
          const isExpanded = expandedCategories.has(category);
          const categoryChecked = items.filter((i) => checked.has(i.id)).length;

          return (
            <div key={category}>
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-surface/50"
              >
                <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <span>{PACKING_CATEGORY_ICONS[category]}</span>
                  {PACKING_CATEGORY_LABELS[category]}
                  <span className="text-stone">
                    ({categoryChecked}/{items.length})
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-stone transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              {isExpanded && (
                <div className="ml-6 space-y-0.5 pb-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleCheck(item.id)}
                      className="flex w-full items-start gap-2 rounded px-1.5 py-1 text-left hover:bg-surface/50"
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          checked.has(item.id)
                            ? "border-sage bg-sage text-white"
                            : "border-border"
                        )}
                      >
                        {checked.has(item.id) && <Check className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0">
                        <span
                          className={cn(
                            "text-xs",
                            checked.has(item.id) ? "text-stone line-through" : "text-foreground"
                          )}
                        >
                          {item.name}
                        </span>
                        <p className="text-[10px] text-stone">{item.reason}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>}
    </div>
  );
}
