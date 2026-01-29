"use client";

import { useState } from "react";
import type { EntryPoint } from "@/types/trip";
import type { ItineraryActivity } from "@/types/itinerary";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EntryPointSearchInput } from "./EntryPointSearchInput";
import { optimizeRouteOrder, type OptimizeRouteResult } from "@/lib/routeOptimizer";
import { logger } from "@/lib/logger";

type DayEntryPointEditorProps = {
  tripId: string;
  dayId: string;
  startPoint?: EntryPoint;
  endPoint?: EntryPoint;
  activities: ItineraryActivity[];
  onSetStartPoint: (entryPoint: EntryPoint | undefined) => void;
  onSetEndPoint: (entryPoint: EntryPoint | undefined) => void;
  onOptimizeRoute: (activityIds: string[]) => void;
};

export function DayEntryPointEditor({
  startPoint,
  endPoint,
  activities,
  onSetStartPoint,
  onSetEndPoint,
  onOptimizeRoute,
}: DayEntryPointEditorProps) {
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeRouteResult | null>(null);

  const handleStartPointSelect = (entryPoint: EntryPoint) => {
    onSetStartPoint(entryPoint);
    setIsStartModalOpen(false);
  };

  const handleEndPointSelect = (entryPoint: EntryPoint) => {
    onSetEndPoint(entryPoint);
    setIsEndModalOpen(false);
  };

  const handleClearStartPoint = () => {
    onSetStartPoint(undefined);
  };

  const handleClearEndPoint = () => {
    onSetEndPoint(undefined);
  };

  const handleSetEndPointSameAsStart = () => {
    if (startPoint) {
      // Create a copy of the start point for the end point
      const endPointCopy: EntryPoint = {
        ...startPoint,
        id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, // New unique ID
      };
      onSetEndPoint(endPointCopy);
    }
  };

  const handleOptimizeRoute = () => {
    if (!startPoint) return;

    setIsOptimizing(true);
    setOptimizeResult(null);
    try {
      const result = optimizeRouteOrder(activities, startPoint, endPoint);
      onOptimizeRoute(result.order);
      setOptimizeResult(result);
      // Clear feedback after 5 seconds
      setTimeout(() => setOptimizeResult(null), 5000);
    } catch (error) {
      logger.error("Failed to optimize route", error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4">
      <h3 className="text-sm font-semibold text-charcoal">Day Entry Points</h3>

      <div className="space-y-2">
        {/* Start Point */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="block text-xs font-medium text-warm-gray mb-1">
              Start Point
            </label>
            {startPoint ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-charcoal">{startPoint.name}</span>
                {startPoint.iataCode && (
                  <span className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono text-stone">
                    {startPoint.iataCode}
                  </span>
                )}
                <span className="text-xs text-stone">
                  ({startPoint.coordinates.lat.toFixed(4)}, {startPoint.coordinates.lng.toFixed(4)})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearStartPoint}
                  className="text-xs"
                >
                  Clear
                </Button>
              </div>
            ) : (
              <p className="text-sm text-stone">Not set</p>
            )}
          </div>
          <div className="ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStartModalOpen(true)}
              className="bg-surface border border-border hover:bg-sand"
            >
              Set Airport
            </Button>
          </div>
        </div>

        {/* End Point */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="block text-xs font-medium text-warm-gray mb-1">
              End Point
            </label>
            {endPoint ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-charcoal">{endPoint.name}</span>
                {endPoint.iataCode && (
                  <span className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono text-stone">
                    {endPoint.iataCode}
                  </span>
                )}
                <span className="text-xs text-stone">
                  ({endPoint.coordinates.lat.toFixed(4)}, {endPoint.coordinates.lng.toFixed(4)})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearEndPoint}
                  className="text-xs"
                >
                  Clear
                </Button>
              </div>
            ) : (
              <p className="text-sm text-stone">Not set</p>
            )}
          </div>
          <div className="ml-4 flex gap-2">
            {startPoint && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetEndPointSameAsStart}
                className="bg-surface border border-border hover:bg-sand text-xs"
              >
                Same as Start
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEndModalOpen(true)}
              className="bg-surface border border-border hover:bg-sand"
            >
              Set Airport
            </Button>
          </div>
        </div>

        {/* Optimize Route Button */}
        <div className="pt-2 border-t border-border">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-foreground-secondary">
              {startPoint
                ? "Rearrange activities to minimize travel time based on your start point."
                : "Set a start point to enable route optimization."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOptimizeRoute}
              disabled={!startPoint || isOptimizing || activities.length === 0}
              className="w-full sm:w-auto bg-surface border border-border hover:bg-sand"
              leftIcon={
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              }
            >
              {isOptimizing ? "Optimizing..." : "Optimize Route"}
            </Button>
            {optimizeResult && (
              <div className="mt-2 text-xs">
                {optimizeResult.orderChanged ? (
                  <p className="text-success">
                    Route optimized! {optimizeResult.optimizedCount} activities reordered.
                    {optimizeResult.skippedCount > 0 && (
                      <span className="text-warning ml-1">
                        ({optimizeResult.skippedCount} skipped - missing coordinates)
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-foreground-secondary">
                    Route is already optimal.
                    {optimizeResult.skippedCount > 0 && (
                      <span className="text-warning ml-1">
                        ({optimizeResult.skippedCount} activities lack coordinates)
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Start Point Modal */}
      <Modal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        title="Set Start Point (Airport)"
        description="Select an airport as the starting location for this day"
      >
        <EntryPointSearchInput
          onSelect={handleStartPointSelect}
          initialValue={startPoint}
        />
      </Modal>

      {/* End Point Modal */}
      <Modal
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        title="Set End Point (Airport)"
        description="Select an airport as the ending location for this day"
      >
        <EntryPointSearchInput
          onSelect={handleEndPointSelect}
          initialValue={endPoint}
        />
      </Modal>
    </div>
  );
}
