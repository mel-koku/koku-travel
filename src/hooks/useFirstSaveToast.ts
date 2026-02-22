"use client";

import { useCallback, useRef } from "react";
import { useToast } from "@/context/ToastContext";
import { FIRST_SAVE_TOAST_STORAGE_KEY } from "@/lib/constants/storage";
import { getLocal, setLocal } from "@/lib/storageHelpers";

/**
 * Shows a one-time educational toast the first time a user saves
 * a location from Places. Explains that saved places feed into trip generation.
 */
export function useFirstSaveToast() {
  const { showToast } = useToast();
  const shownRef = useRef(false);

  const maybeShowToast = useCallback(() => {
    if (shownRef.current) return;
    if (getLocal(FIRST_SAVE_TOAST_STORAGE_KEY)) {
      shownRef.current = true;
      return;
    }

    shownRef.current = true;
    setLocal(FIRST_SAVE_TOAST_STORAGE_KEY, "1");

    showToast("Saved places are included when you build a trip.", {
      variant: "info",
      actionLabel: "Plan Trip",
      actionHref: "/trip-builder",
      duration: 6000,
    });
  }, [showToast]);

  return maybeShowToast;
}
