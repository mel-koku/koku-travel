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
import { GripVertical, X, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { REGIONS } from "@/data/regions";
import { getRegionForCity } from "@/data/regions";
import { redistributeOnRemove } from "@/lib/tripBuilder/cityDayAllocation";
import type { CityId } from "@/types/trip";

type CityDisplay = {
  id: CityId;
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

function resolveCityDisplay(cityId: CityId): CityDisplay {
  const known = KNOWN_CITY_MAP.get(cityId);
  if (known) return { id: cityId, name: known.name, regionName: known.regionName };

  const regionId = getRegionForCity(cityId);
  const region = regionId ? REGIONS.find((r) => r.id === regionId) : undefined;
  return {
    id: cityId,
    name: cityId.charAt(0).toUpperCase() + cityId.slice(1),
    regionName: region?.name,
  };
}

// --- Sortable item ---

function SortableCityItem({
  city,
  onRemove,
  variant,
  days,
  onIncrement,
  onDecrement,
  canIncrement,
  canDecrement,
}: {
  city: CityDisplay;
  onRemove: (cityId: CityId) => void;
  variant: "a" | "b";
  days?: number;
  onIncrement?: () => void;
  onDecrement?: () => void;
  canIncrement?: boolean;
  canDecrement?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: city.id });

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
      className={`group flex items-center gap-2 rounded-xl px-3 py-2 transition-shadow ${
        isDragging
          ? isA
            ? "z-10 shadow-lg shadow-brand-primary/10 bg-surface border border-brand-primary/30"
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

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(city.id)}
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
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
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
  onReorder: (newOrder: CityId[]) => void;
  onRemove: (cityId: CityId) => void;
  variant?: "a" | "b";
  cityDays?: Record<CityId, number>;
  onDaysChange?: (cityId: CityId, days: number) => void;
  totalDays?: number;
};

export function SortableCityList({
  cities,
  onReorder,
  onRemove,
  variant = "a",
  cityDays,
  onDaysChange,
  totalDays,
}: SortableCityListProps) {
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // --- Undo-on-remove state ---
  const [pendingRemoves, setPendingRemoves] = useState<Set<CityId>>(new Set());
  const onRemoveRef = useRef(onRemove);
  const pendingRef = useRef(pendingRemoves);

  useEffect(() => {
    onRemoveRef.current = onRemove;
  }, [onRemove]);

  useEffect(() => {
    pendingRef.current = pendingRemoves;
  }, [pendingRemoves]);

  const handleRemove = useCallback((cityId: CityId) => {
    setPendingRemoves((prev) => new Set(prev).add(cityId));
  }, []);

  const handleUndo = useCallback((cityId: CityId) => {
    setPendingRemoves((prev) => {
      const next = new Set(prev);
      next.delete(cityId);
      return next;
    });
  }, []);

  // Commit all pending removals on unmount
  useEffect(() => {
    return () => {
      for (const id of pendingRef.current) {
        onRemoveRef.current(id);
      }
    };
  }, []);

  const cityDisplays = cities.map(resolveCityDisplay);
  const hasPending = pendingRemoves.size > 0;
  const sortableIds = hasPending
    ? cities.filter((id) => !pendingRemoves.has(id))
    : cities;

  // Compute display-level days that reflect pending removals
  const displayCityDays = useMemo(() => {
    if (!cityDays || !hasPending) return cityDays;
    let days = { ...cityDays };
    for (const removedId of pendingRemoves) {
      const remaining = sortableIds.filter((id) => id in days || !pendingRemoves.has(id));
      days = redistributeOnRemove(days, removedId, remaining);
    }
    return days;
  }, [cityDays, hasPending, pendingRemoves, sortableIds]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = cities.indexOf(String(active.id));
      const newIndex = cities.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      onReorder(arrayMove(cities, oldIndex, newIndex));
    },
    [cities, onReorder],
  );

  if (cities.length === 0) return null;

  const isA = variant === "a";

  // Only show steppers when cityDays is provided, 2+ active cities, and no pending removes
  const showSteppers = !!cityDays && !!onDaysChange && sortableIds.length >= 2 && !hasPending;

  // Calculate allocated days for the status line using display values
  const allocatedDays = displayCityDays
    ? Object.values(displayCityDays).reduce<number>((sum, d) => sum + d, 0)
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
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {cityDisplays.map((city) => {
                if (pendingRemoves.has(city.id)) {
                  return (
                    <motion.div
                      key={city.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <PendingCityItem
                        city={city}
                        onUndo={() => handleUndo(city.id)}
                        variant={variant}
                      />
                    </motion.div>
                  );
                }

                const daysSource = displayCityDays ?? cityDays;
                const showDays = !!daysSource && !!onDaysChange && sortableIds.length >= 2;
                const days = showDays ? daysSource[city.id] : undefined;
                // Find adjacent city to take/give a day (skip pending cities)
                const activeCities = sortableIds;
                const activeIndex = activeCities.indexOf(city.id);
                const adjacentIndex = activeIndex < activeCities.length - 1 ? activeIndex + 1 : activeIndex - 1;
                const adjacentCity = activeCities[adjacentIndex];
                const adjacentDays = adjacentCity && daysSource ? daysSource[adjacentCity] : undefined;

                return (
                  <motion.div
                    key={city.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SortableCityItem
                      city={city}
                      onRemove={handleRemove}
                      variant={variant}
                      days={days}
                      canDecrement={showSteppers && (days ?? 0) > 1}
                      canIncrement={showSteppers && (adjacentDays ?? 0) > 1}
                      onDecrement={
                        showSteppers && onDaysChange
                          ? () => onDaysChange(city.id, (days ?? 1) - 1)
                          : undefined
                      }
                      onIncrement={
                        showSteppers && onDaysChange
                          ? () => onDaysChange(city.id, (days ?? 1) + 1)
                          : undefined
                      }
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>

      {/* Day allocation status line */}
      {!!displayCityDays && !!onDaysChange && sortableIds.length >= 2 && totalDays !== undefined && allocatedDays !== undefined && (
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
