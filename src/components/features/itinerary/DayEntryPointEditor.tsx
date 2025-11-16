"use client";

import { useState } from "react";
import type { EntryPoint, EntryPointType } from "@/types/trip";
import type { ItineraryActivity } from "@/types/itinerary";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EntryPointSearchInput } from "./EntryPointSearchInput";
import { optimizeRouteOrder } from "@/lib/routeOptimizer";
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
  const [editingType, setEditingType] = useState<EntryPointType>("hotel");
  const [isOptimizing, setIsOptimizing] = useState(false);

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
    try {
      const optimizedOrder = optimizeRouteOrder(activities, startPoint, endPoint);
      onOptimizeRoute(optimizedOrder);
    } catch (error) {
      logger.error("Failed to optimize route", error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">Day Entry Points</h3>
      
      <div className="space-y-2">
        {/* Start Point */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Start Point
            </label>
            {startPoint ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900">{startPoint.name}</span>
                <span className="text-xs text-gray-500">
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
              <p className="text-sm text-gray-500">Not set</p>
            )}
          </div>
          <div className="ml-4">
            <Dropdown
              label="Set Start Point"
              items={[
                { id: "hotel", label: "Hotel", onSelect: () => { setEditingType("hotel"); setIsStartModalOpen(true); } },
                { id: "station", label: "Station", onSelect: () => { setEditingType("station"); setIsStartModalOpen(true); } },
                { id: "airport", label: "Airport", onSelect: () => { setEditingType("airport"); setIsStartModalOpen(true); } },
              ]}
              triggerClassName="bg-gray-50 border border-gray-200 hover:bg-gray-100"
              menuClassName="border border-gray-200 shadow-md"
            />
          </div>
        </div>

        {/* End Point */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              End Point
            </label>
            {endPoint ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900">{endPoint.name}</span>
                <span className="text-xs text-gray-500">
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
              <p className="text-sm text-gray-500">Not set</p>
            )}
          </div>
          <div className="ml-4">
            <Dropdown
              label="Set End Point"
              items={[
                ...(startPoint
                  ? [
                      {
                        id: "same-as-start",
                        label: "Same as starting point",
                        onSelect: handleSetEndPointSameAsStart,
                        separator: false,
                      },
                    ]
                  : []),
                { id: "hotel", label: "Hotel", onSelect: () => { setEditingType("hotel"); setIsEndModalOpen(true); }, separator: !!startPoint },
                { id: "station", label: "Station", onSelect: () => { setEditingType("station"); setIsEndModalOpen(true); } },
                { id: "airport", label: "Airport", onSelect: () => { setEditingType("airport"); setIsEndModalOpen(true); } },
              ]}
              triggerClassName="bg-gray-50 border border-gray-200 hover:bg-gray-100"
              menuClassName="border border-gray-200 shadow-md"
            />
          </div>
        </div>

        {/* Optimize Route Button */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-600">
              {startPoint
                ? "Rearrange activities to minimize travel time based on your start point."
                : "Set a start point to enable route optimization."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOptimizeRoute}
              disabled={!startPoint || isOptimizing || activities.length === 0}
              className="w-full sm:w-auto bg-gray-50 border border-gray-200 hover:bg-gray-100"
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
          </div>
        </div>
      </div>

      {/* Start Point Modal */}
      <Modal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        title={`Set Start Point (${editingType})`}
        description="Enter the starting location for this day"
      >
        <EntryPointSearchInput
          type={editingType}
          onSelect={handleStartPointSelect}
          initialValue={startPoint}
        />
      </Modal>

      {/* End Point Modal */}
      <Modal
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        title={`Set End Point (${editingType})`}
        description="Enter the ending location for this day"
      >
        <EntryPointSearchInput
          type={editingType}
          onSelect={handleEndPointSelect}
          initialValue={endPoint}
        />
      </Modal>
    </div>
  );
}

// Simple dropdown component for type selection
function Dropdown({
  label,
  items,
  triggerClassName,
  menuClassName,
}: {
  label: string;
  items: Array<{ id: string; label: string; onSelect: () => void; separator?: boolean }>;
  triggerClassName?: string;
  menuClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName || "bg-gray-50 border border-gray-200 hover:bg-gray-100"}
        rightIcon={
          <svg
            className={`h-4 w-4 transform transition-transform ${isOpen ? "rotate-180" : ""}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 20"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
          </svg>
        }
      >
        {label}
      </Button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className={`absolute right-0 z-20 mt-2 w-56 rounded-lg bg-white ${menuClassName || "border border-gray-200 shadow-md"}`}>
            {items.map((item, index) => (
              <div key={item.id}>
                {item.separator && index > 0 && (
                  <div className="border-t border-gray-200/60 my-1" />
                )}
                <button
                  onClick={() => {
                    item.onSelect();
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 ${
                    index === 0 ? "rounded-t-lg" : ""
                  } ${index === items.length - 1 ? "rounded-b-lg" : ""} ${
                    item.id === "same-as-start" ? "font-medium text-indigo-600" : ""
                  }`}
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

