"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Minus, Plus, Copy } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

import { REGIONS } from "@/data/regions";
import { getRegionForCity } from "@/data/regions";
import { redistributeOnRemove } from "@/lib/tripBuilder/cityDayAllocation";
import type { CityId } from "@/types/trip";

type CityDisplay = {
  id: CityId;
  index: number;
  name: string;
  regionName?: string;
};

// Build a static lookup for known cities → display name + region
const KNOWN_CITY_MAP = new Map<string, { name: string; regionName: string }>();
for (const r of REGIONS) {
  for (const c of r.cities) {
    KNOWN_CITY_MAP.set(c.id, { name: c.name, regionName: r.name });
  }
}

function resolveCityDisplay(cityId: CityId, index: number): CityDisplay {
  const known = KNOWN_CITY_MAP.get(cityId);
  if (known) return { id: cityId, index, name: known.name, regionName: known.regionName };

  const regionId = getRegionForCity(cityId);
  const region = regionId ? REGIONS.find((r) => r.id === regionId) : undefined;
  return {
    id: cityId,
    index,
    name: cityId.charAt(0).toUpperCase() + cityId.slice(1),
    regionName: region?.name,
  };
}

/** Composite sortable ID: unique even with duplicate cities */
function sortableId(cityId: CityId, index: number): string {
  return `${cityId}-${index}`;
}

/** Parse index from composite sortable ID */
function parseIndex(compositeId: string): number {
  const lastDash = compositeId.lastIndexOf("-");
  return Number(compositeId.slice(lastDash + 1));
}

// --- Sortable item ---

function SortableCityItem({
  city,
  compositeId,
  onRemove,
  onDuplicate,
  variant,
  days,
  onIncrement,
  onDecrement,
  canIncrement,
  canDecrement,
  canDuplicate,
}: {
  city: CityDisplay;
  compositeId: string;
  onRemove: (index: number) => void;
  onDuplicate?: (index: number) => void;
  variant: "a" | "b";
  days?: number;
  onIncrement?: () => void;
  onDecrement?: () => void;
  canIncrement?: boolean;
  canDecrement?: boolean;
  canDuplicate?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: compositeId });

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition: transition ?? undefined,
  };

  const isA = variant === "a";
  const showStepper = days !== undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group flex items-center gap-2 rounded-lg px-3 py-2 transition-shadow ${
        isDragging
          ? isA
            ? "z-10 shadow-[var(--shadow-elevated)] bg-surface border border-brand-primary/30"
            : "z-10 shadow-[var(--shadow-elevated)] bg-white border border-[var(--primary)]/30"
          : isA
            ? "bg-surface/60 border border-border/50"
            : "bg-white border border-[var(--border)]"
      }`}
    >
      {/* Drag handle */}
      <div
        className="flex cursor-grab items-center active:cursor-grabbing"
        {...(listeners as Record<string, unknown>)}
      >
        <GripVertical
          className={`h-4 w-4 ${
            isA ? "text-stone" : "text-[var(--muted-foreground)]"
          }`}
        />
      </div>

      {/* City info */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium ${
            isA ? "text-foreground" : "text-[var(--foreground)]"
          }`}
        >
          {city.name}
        </span>
        {city.regionName && (
          <span
            className={`ml-1.5 text-xs ${
              isA ? "text-stone" : "text-[var(--muted-foreground)]"
            }`}
          >
            {city.regionName}
          </span>
        )}
      </div>

      {/* Day stepper */}
      {showStepper && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDecrement}
            disabled={!canDecrement}
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
              !canDecrement
                ? "opacity-30 cursor-not-allowed"
                : isA
                  ? "hover:bg-brand-primary/10 text-stone hover:text-foreground"
                  : "hover:bg-[var(--primary)]/10 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
            aria-label={`Fewer days in ${city.name}`}
          >
            <Minus className="h-3 w-3" />
          </button>
          <span
            className={`min-w-[2.5rem] text-center font-mono text-xs tabular-nums ${
              isA ? "text-foreground" : "text-[var(--foreground)]"
            }`}
          >
            {days}d
          </span>
          <button
            type="button"
            onClick={onIncrement}
            disabled={!canIncrement}
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
              !canIncrement
                ? "opacity-30 cursor-not-allowed"
                : isA
                  ? "hover:bg-brand-primary/10 text-stone hover:text-foreground"
                  : "hover:bg-[var(--primary)]/10 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
            aria-label={`More days in ${city.name}`}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Duplicate button */}
      {onDuplicate && (
        <button
          type="button"
          onClick={() => onDuplicate(city.index)}
          disabled={!canDuplicate}
          className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
            !canDuplicate
              ? "opacity-30 cursor-not-allowed"
              : isA
                ? "hover:bg-brand-primary/10 text-stone hover:text-foreground"
                : "hover:bg-[var(--primary)]/10 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
          aria-label={`Duplicate ${city.name}`}
          title="Return to this city"
        >
          <Copy className="h-3 w-3" />
        </button>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(city.index)}
        className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
          isA
            ? "hover:bg-brand-primary/10"
            : "hover:bg-[var(--primary)]/10"
        }`}
        aria-label={`Remove ${city.name}`}
      >
        <X
          className={`h-3 w-3 ${
            isA
              ? "text-stone hover:text-foreground"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        />
      </button>
    </div>
  );
}

// --- Pending-remove row (grayed out with Undo) ---

function PendingCityItem({
  city,
  onUndo,
  variant,
}: {
  city: CityDisplay;
  onUndo: () => void;
  variant: "a" | "b";
}) {
  const isA = variant === "a";

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
        isA
          ? "opacity-40 bg-surface/30 border border-border/30"
          : "opacity-40 bg-white/60 border border-[var(--border)]/30"
      }`}
    >
      {/* Spacer matching drag handle width */}
      <div className="w-4" />

      {/* City info */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium ${
            isA ? "text-foreground" : "text-[var(--foreground)]"
          }`}
        >
          {city.name}
        </span>
        {city.regionName && (
          <span
            className={`ml-1.5 text-xs ${
              isA ? "text-stone" : "text-[var(--muted-foreground)]"
            }`}
          >
            {city.regionName}
          </span>
        )}
      </div>

      {/* Undo button */}
      <button
        type="button"
        onClick={onUndo}
        className={`text-xs font-medium ${
          isA ? "text-brand-primary" : "text-[var(--primary)]"
        }`}
      >
        Undo
      </button>
    </div>
  );
}

// --- Main component ---

export type SortableCityListProps = {
  cities: CityId[];
  onReorder: (newCities: CityId[], newCityDays?: number[]) => void;
  onRemove: (index: number) => void;
  variant?: "a" | "b";
  cityDays?: number[];
  onDaysChange?: (index: number, days: number) => void;
  totalDays?: number;
  onDuplicate?: (index: number) => void;
  /** Render additional content below each city row (e.g., accommodation input) */
  renderAfterCity?: (cityId: CityId, index: number) => React.ReactNode;
};

export function SortableCityList({
  cities,
  onReorder,
  onRemove,
  variant = "a",
  cityDays,
  onDaysChange,
  totalDays,
  onDuplicate,
  renderAfterCity,
}: SortableCityListProps) {
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // --- Undo-on-remove state (by index) ---
  const [pendingRemoves, setPendingRemoves] = useState<Set<number>>(new Set());
  const onRemoveRef = useRef(onRemove);
  const pendingRef = useRef(pendingRemoves);
  const citiesRef = useRef(cities);

  useEffect(() => {
    onRemoveRef.current = onRemove;
  }, [onRemove]);

  useEffect(() => {
    pendingRef.current = pendingRemoves;
  }, [pendingRemoves]);

  useEffect(() => {
    citiesRef.current = cities;
  }, [cities]);

  // Reset pending removes when cities change (e.g., new city added externally)
  useEffect(() => {
    setPendingRemoves(new Set());
  }, [cities.length]);

  const handleRemove = useCallback((index: number) => {
    setPendingRemoves((prev) => new Set(prev).add(index));
  }, []);

  const handleUndo = useCallback((index: number) => {
    setPendingRemoves((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  // Commit all pending removals on unmount (highest index first to keep indices stable)
  useEffect(() => {
    return () => {
      const sorted = Array.from(pendingRef.current).sort((a, b) => b - a);
      for (const idx of sorted) {
        onRemoveRef.current(idx);
      }
    };
  }, []);

  const cityDisplays = cities.map((c, i) => resolveCityDisplay(c, i));
  const hasPending = pendingRemoves.size > 0;

  // Active (non-pending) indices
  const activeIndices = useMemo(
    () => cities.map((_, i) => i).filter((i) => !pendingRemoves.has(i)),
    [cities, pendingRemoves],
  );

  // Composite sortable IDs for active items
  const activeSortableIds = useMemo(
    () => activeIndices.map((i) => sortableId(cities[i]!, i)),
    [activeIndices, cities],
  );

  // Compute display-level days that reflect pending removals
  const displayCityDays = useMemo(() => {
    if (!cityDays || !hasPending) return cityDays;
    let days = [...cityDays];
    // Remove in descending index order to keep indices stable
    const sorted = Array.from(pendingRemoves).sort((a, b) => b - a);
    for (const idx of sorted) {
      days = redistributeOnRemove(days, idx);
    }
    return days;
  }, [cityDays, hasPending, pendingRemoves]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = parseIndex(String(active.id));
      const newIndex = parseIndex(String(over.id));
      if (oldIndex === newIndex) return;

      const newCities = arrayMove(cities, oldIndex, newIndex);
      const newDays = cityDays ? arrayMove([...cityDays], oldIndex, newIndex) : undefined;
      onReorder(newCities, newDays);
    },
    [cities, cityDays, onReorder],
  );

  if (cities.length === 0) return null;

  const isA = variant === "a";

  // Only show steppers when cityDays is provided, 2+ active cities, and no pending removes
  const activeCount = activeIndices.length;
  const showSteppers = !!cityDays && !!onDaysChange && activeCount >= 2 && !hasPending;

  // Calculate allocated days for the status line using display values
  const allocatedDays = displayCityDays
    ? displayCityDays.reduce((sum, d) => sum + d, 0)
    : undefined;

  return (
    <div className="mt-3">
      {cities.length >= 2 && (
        <p
          className={`mb-2 text-xs ${
            isA ? "text-stone" : "text-[var(--muted-foreground)]"
          }`}
        >
          Drag to set your route order
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={activeSortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {cityDisplays.map((city) => {
                const cId = sortableId(city.id, city.index);

                if (pendingRemoves.has(city.index)) {
                  return (
                    <m.div
                      key={cId}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <PendingCityItem
                        city={city}
                        onUndo={() => handleUndo(city.index)}
                        variant={variant}
                      />
                    </m.div>
                  );
                }

                // Map from the original index to the display-days index (after pending removals)
                const displayIndex = activeIndices.indexOf(city.index);
                const daysSource = displayCityDays ?? cityDays;
                const showDays = !!daysSource && !!onDaysChange && activeCount >= 2;
                const days = showDays ? daysSource[displayIndex] : undefined;

                // Find adjacent entry to take/give a day
                const adjacentDisplayIdx = displayIndex < activeCount - 1 ? displayIndex + 1 : displayIndex - 1;
                const adjacentDays = adjacentDisplayIdx >= 0 && daysSource ? daysSource[adjacentDisplayIdx] : undefined;

                return (
                  <m.div
                    key={cId}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SortableCityItem
                      city={city}
                      compositeId={cId}
                      onRemove={handleRemove}
                      onDuplicate={onDuplicate}
                      variant={variant}
                      days={days}
                      canDecrement={showSteppers && (days ?? 0) > 1}
                      canIncrement={showSteppers && (adjacentDays ?? 0) > 1}
                      canDuplicate={!!onDuplicate && (cityDays ? (cityDays[city.index] ?? 0) >= 2 : true)}
                      onDecrement={
                        showSteppers && onDaysChange
                          ? () => onDaysChange(city.index, (cityDays?.[city.index] ?? 1) - 1)
                          : undefined
                      }
                      onIncrement={
                        showSteppers && onDaysChange
                          ? () => onDaysChange(city.index, (cityDays?.[city.index] ?? 1) + 1)
                          : undefined
                      }
                    />
                    {renderAfterCity?.(city.id, city.index)}
                  </m.div>
                );
              })}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>

      {/* Day allocation status line */}
      {!!displayCityDays && !!onDaysChange && activeCount >= 2 && totalDays !== undefined && allocatedDays !== undefined && (
        <p
          className={`mt-2 text-xs font-mono tabular-nums ${
            allocatedDays === totalDays
              ? isA ? "text-success" : "text-[var(--success)]"
              : isA ? "text-warning" : "text-[var(--warning)]"
          }`}
        >
          {allocatedDays}/{totalDays} days allocated
        </p>
      )}
    </div>
  );
}
