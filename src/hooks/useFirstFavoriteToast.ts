"use client";

import { useCallback, useRef } from "react";
import { useToast } from "@/context/ToastContext";

const STORAGE_KEY = "koku_first_favorite_toast_shown";

/**
 * Shows a one-time educational toast the first time a user favorites
 * a location from Explore. Explains that favorites feed into trip generation.
 */
export function useFirstFavoriteToast() {
  const { showToast } = useToast();
  const shownRef = useRef(false);

  const maybeShowToast = useCallback(() => {
    if (shownRef.current) return;
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY)) {
        shownRef.current = true;
        return;
      }
    } catch {
      // localStorage unavailable
      return;
    }

    shownRef.current = true;
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore storage errors
    }

    showToast("Your favorites are automatically included when you build a trip.", {
      variant: "info",
      actionLabel: "Plan Trip",
      actionHref: "/trip-builder",
      duration: 6000,
    });
  }, [showToast]);

  return maybeShowToast;
}
