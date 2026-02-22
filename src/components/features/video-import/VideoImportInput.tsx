"use client";

import { useState, useCallback, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { isValidVideoUrl } from "@/lib/video/platforms";
import { VideoImportResult } from "./VideoImportResult";
import { PlatformIcon } from "./PlatformIcon";

type ImportState =
  | { status: "idle" }
  | { status: "extracting"; url: string }
  | { status: "result"; data: ImportResultData }
  | { status: "error"; message: string; failedUrl: string };

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

type VideoImportInputProps = {
  onImportComplete?: (locationId: string, isNewLocation: boolean) => void;
  className?: string;
};

export function VideoImportInput({ onImportComplete, className = "" }: VideoImportInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [hintValue, setHintValue] = useState("");
  const [state, setState] = useState<ImportState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const handleImport = useCallback(async (url: string, hint?: string) => {
    if (!isValidVideoUrl(url)) {
      setState({ status: "error", message: "Paste a YouTube, TikTok, or Instagram link.", failedUrl: url });
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

      if (!response.ok || data.status === "rejected" || data.status === "low_confidence") {
        setState({
          status: "error",
          message: data.error || data.reason || "Could not identify a location from this post.",
          failedUrl: url,
        });
        return;
      }

      if (data.status === "success") {
        setState({ status: "result", data });
        setHintValue("");
        onImportComplete?.(data.location.id, data.isNewLocation);
      } else {
        setState({ status: "error", message: data.error || "Something went wrong.", failedUrl: url });
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setState({ status: "error", message: "Network error. Check your connection and try again.", failedUrl: url });
    }
  }, [onImportComplete]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const url = inputValue.trim();
      if (url) handleImport(url);
    },
    [inputValue, handleImport],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData("text").trim();
      if (text && isValidVideoUrl(text)) {
        e.preventDefault();
        setInputValue(text);
        handleImport(text);
      }
    },
    [handleImport],
  );

  const handleRetryWithHint = useCallback(() => {
    if (state.status === "error" && state.failedUrl && hintValue.trim()) {
      handleImport(state.failedUrl, hintValue.trim());
    }
  }, [state, hintValue, handleImport]);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setInputValue("");
    setHintValue("");
    setState({ status: "idle" });
  }, []);

  return (
    <div className={className}>
      {/* Input */}
      {state.status !== "result" && (
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-stone">
              <PlatformIcon platform="youtube" className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPaste={handlePaste}
              placeholder="Paste a video or post URL..."
              disabled={state.status === "extracting"}
              className="w-full rounded-xl border border-border bg-surface/50 py-2.5 pl-9 pr-12 text-base text-foreground placeholder:text-stone focus:border-brand-primary/50 focus:outline-none focus:ring-1 focus:ring-brand-primary/20 transition disabled:opacity-60"
            />
            {state.status === "extracting" ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
              </div>
            ) : inputValue ? (
              <button
                type="button"
                onClick={handleReset}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-foreground-secondary transition"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </form>
      )}

      {/* Loading state */}
      {state.status === "extracting" && (
        <div className="mt-3 flex items-center gap-2 text-sm text-foreground-secondary">
          <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
          <span>Identifying location...</span>
        </div>
      )}

      {/* Error state with hint retry */}
      {state.status === "error" && (
        <div className="mt-2 space-y-2.5">
          <p className="text-sm text-error">{state.message}</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={hintValue}
              onChange={(e) => setHintValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRetryWithHint(); }}
              placeholder="e.g. ramen shop in Shibuya"
              maxLength={200}
              className="flex-1 rounded-xl border border-border bg-surface/50 px-3 py-2 text-sm text-foreground placeholder:text-stone focus:border-brand-primary/50 focus:outline-none focus:ring-1 focus:ring-brand-primary/20 transition"
            />
            <button
              type="button"
              onClick={handleRetryWithHint}
              disabled={!hintValue.trim()}
              className="shrink-0 rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Retry
            </button>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-medium text-stone underline underline-offset-2 hover:text-foreground-secondary"
          >
            Try another URL
          </button>
        </div>
      )}

      {/* Result */}
      {state.status === "result" && (
        <div>
          <VideoImportResult
            location={state.data.location}
            isNewLocation={state.data.isNewLocation}
            platform={state.data.videoMetadata.platform}
            confidence={state.data.extraction.confidence}
            locationNameJapanese={state.data.extraction.locationNameJapanese}
          />
          <button
            type="button"
            onClick={handleReset}
            className="mt-3 w-full rounded-xl border border-border py-2.5 text-sm font-medium text-foreground-secondary hover:border-brand-primary/30 hover:text-foreground transition active:scale-[0.98]"
          >
            Import Another
          </button>
        </div>
      )}
    </div>
  );
}
