"use client";

import { useEffect, useState } from "react";

type SavingIndicatorProps = {
  isSaving: boolean;
  lastSaved?: Date | null;
};

export function SavingIndicator({ isSaving, lastSaved }: SavingIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!isSaving && lastSaved) {
      setShowSaved(true);
      const timer = setTimeout(() => {
        setShowSaved(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaving, lastSaved]);

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <svg
          className="h-4 w-4 animate-spin text-indigo-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <span>Saving...</span>
      </div>
    );
  }

  if (showSaved && lastSaved) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600">
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span>Saved</span>
      </div>
    );
  }

  return null;
}

