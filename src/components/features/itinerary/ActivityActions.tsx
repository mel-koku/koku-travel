"use client";

import { Dropdown } from "@/components/ui/Dropdown";
import type { ItineraryActivity } from "@/types/itinerary";

type ActivityActionsProps = {
  activity: ItineraryActivity;
  tripId: string;
  dayId: string;
  onReplace: () => void;
  onDelete: () => void;
  onCopy: () => void;
  disabled?: boolean;
};

export function ActivityActions({
  activity,
  onReplace,
  onDelete,
  onCopy,
  disabled = false,
}: ActivityActionsProps) {
  // Only show replace option for place activities
  const canReplace = activity.kind === "place";

  const items = [
    ...(canReplace
      ? [
          {
            id: "replace",
            label: "Replace",
            description: "Find alternatives for this activity",
            icon: (
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
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            ),
            onSelect: () => {
              onReplace();
            },
            disabled,
          },
        ]
      : []),
    {
      id: "copy",
      label: "Copy",
      description: "Duplicate this activity",
      icon: (
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
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
      onSelect: () => {
        onCopy();
      },
      disabled,
    },
    {
      id: "delete",
      label: "Delete",
      description: "Remove this activity",
      icon: (
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
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      ),
      onSelect: () => {
        if (window.confirm("Are you sure you want to delete this activity?")) {
          onDelete();
        }
      },
      disabled,
    },
  ];

  return (
    <Dropdown
      label={
        <svg
          className="h-5 w-5 text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-label="Activity actions"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      }
      items={items}
      align="end"
      className="inline-flex"
      triggerClassName="p-1.5 hover:bg-gray-100 rounded-lg transition"
      menuClassName="w-56"
      hideChevron
    />
  );
}

