"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { isValidVideoUrl } from "@/lib/video/platforms";

type ImportResultData = {
  location: {
    id: string;
    name: string;
    city: string;
    region: string;
    category: string;
    image: string;
    primaryPhotoUrl?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    shortDescription?: string | null;
    source?: string | null;
  };
  isNewLocation: boolean;
  extraction: {
    locationName: string;
    locationNameJapanese?: string;
    city: string;
    category: string;
    confidence: string;
  };
  videoMetadata: {
    platform: string;
    title: string;
    authorName: string;
    thumbnailUrl?: string | null;
  };
};

export type ImportState =
  | { status: "idle" }
  | { status: "extracting"; url: string }
  | { status: "result"; data: ImportResultData }
  | { status: "error"; message: string; failedUrl: string };

type UseVideoImportOptions = {
  onImportComplete?: (locationId: string, isNewLocation: boolean) => void;
};

export function useVideoImport({ onImportComplete }: UseVideoImportOptions = {}) {
  const [state, setState] = useState<ImportState>({ status: "idle" });
  const [hintValue, setHintValue] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleImport = useCallback(
    async (url: string, hint?: string) => {
      if (!isValidVideoUrl(url)) {
        setState({
          status: "error",
          message: "Paste a YouTube, TikTok, or Instagram link.",
          failedUrl: url,
        });
        return;
      }

      // Abort any in-progress request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ status: "extracting", url });

      try {
        const response = await fetch("/api/video-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, ...(hint ? { hint } : {}) }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (controller.signal.aborted) return;

        if (
          !response.ok ||
          data.status === "rejected" ||
          data.status === "low_confidence"
        ) {
          setState({
            status: "error",
            message:
              data.error ||
              data.reason ||
              "Could not identify a location from this post.",
            failedUrl: url,
          });
          return;
        }

        if (data.status === "success") {
          setState({ status: "result", data });
          setHintValue("");
          onImportComplete?.(data.location.id, data.isNewLocation);
        } else {
          setState({
            status: "error",
            message: data.error || "Something went wrong.",
            failedUrl: url,
          });
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setState({
          status: "error",
          message: "Network error. Check your connection and try again.",
          failedUrl: url,
        });
      }
    },
    [onImportComplete],
  );

  const handleRetryWithHint = useCallback(() => {
    if (state.status === "error" && state.failedUrl && hintValue.trim()) {
      handleImport(state.failedUrl, hintValue.trim());
    }
  }, [state, hintValue, handleImport]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setHintValue("");
    setState({ status: "idle" });
  }, []);

  return {
    state,
    hintValue,
    setHintValue,
    handleImport,
    handleRetryWithHint,
    reset,
  };
}
