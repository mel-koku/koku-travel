"use client";

import { useCallback, useRef } from "react";
import { useToast } from "@/context/ToastContext";
import { FIRST_FAVORITE_TOAST_STORAGE_KEY } from "@/lib/constants/storage";
import { getLocal, setLocal } from "@/lib/storageHelpers";

/**
 * Shows a one-time educational toast the first time a user favorites
 * a location from Explore. Explains that favorites feed into trip generation.
 */
export function useFirstFavoriteToast() {
  const { showToast } = useToast();
  const shownRef = useRef(false);

  const maybeShowToast = useCallback(() => {
    if (shownRef.current) return;
    if (getLocal(FIRST_FAVORITE_TOAST_STORAGE_KEY)) {
      shownRef.current = true;
      return;
    }

    shownRef.current = true;
    setLocal(FIRST_FAVORITE_TOAST_STORAGE_KEY, "1");

    showToast("Your favorites are automatically included when you build a trip.", {
      variant: "info",
      actionLabel: "Plan Trip",
      actionHref: "/trip-builder",
      duration: 6000,
    });
  }, [showToast]);

  return maybeShowToast;
}
