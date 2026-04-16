"use client";

import { useEffect, useRef } from "react";
import { APP_STATE_STORAGE_KEY, APP_STATE_DEBOUNCE_MS } from "@/lib/constants";
import { sliceRegistry } from "./syncRegistry";

type HydrationCallback = (hydrated: Record<string, unknown>) => void;

export function useAppStateSync(params: {
  onHydrate: HydrationCallback;
  getCombinedState: () => Record<string, unknown>;
}) {
  const { onHydrate, getCombinedState } = params;
  const hydratedRef = useRef(false);
  const writeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (hydratedRef.current || typeof window === "undefined") return;
    hydratedRef.current = true;

    try {
      const raw = localStorage.getItem(APP_STATE_STORAGE_KEY);
      if (!raw) {
        onHydrate({});
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const hydrated: Record<string, unknown> = {};
      for (const serializer of sliceRegistry.all()) {
        hydrated[serializer.key] = serializer.deserialize(parsed[serializer.key]);
      }
      onHydrate(hydrated);
    } catch {
      onHydrate({});
    }
  }, [onHydrate]);

  const scheduleWrite = () => {
    if (typeof window === "undefined") return;
    if (writeTimeoutRef.current) clearTimeout(writeTimeoutRef.current);
    writeTimeoutRef.current = setTimeout(() => {
      try {
        const state = getCombinedState();
        const blob: Record<string, unknown> = {};
        for (const serializer of sliceRegistry.all()) {
          blob[serializer.key] = serializer.serialize(state[serializer.key]);
        }
        localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(blob));
      } catch {
        // Quota or serialization errors: swallow (matches current AppState behavior).
      }
    }, APP_STATE_DEBOUNCE_MS);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flush = () => {
      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
        writeTimeoutRef.current = null;
      }
      try {
        const state = getCombinedState();
        const blob: Record<string, unknown> = {};
        for (const serializer of sliceRegistry.all()) {
          blob[serializer.key] = serializer.serialize(state[serializer.key]);
        }
        localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(blob));
      } catch {
        // best-effort
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [getCombinedState]);

  return { scheduleWrite };
}
