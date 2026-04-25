"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { getGtag } from "@/lib/analytics/customLocations";

type DownloadBookButtonProps = {
  tripId: string;
  locked?: boolean;
  onLockedClick?: () => void;
};

type DownloadState = "idle" | "generating" | "fallback";

const CLIENT_TIMEOUT_MS = 20_000;

/**
 * Primary path: POST /api/trips/[id]/pdf, receive blob, trigger download.
 * Fallback (on any error, timeout, or offline): open /print/trip/[id] in a
 * new tab so the user can use the browser's native print dialog.
 */
export function DownloadBookButton({ tripId, locked, onLockedClick }: DownloadBookButtonProps) {
  const [state, setState] = useState<DownloadState>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isUnmountedRef = useRef(false);
  const { showToast } = useToast();

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  const fallbackToPrintTab = useCallback(
    (message: string) => {
      if (isUnmountedRef.current) return;
      setState("fallback");
      showToast(message, { variant: "info", duration: 4000 });
      window.open(`/print/trip/${tripId}`, "_blank", "noopener,noreferrer");
      resetTimerRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) setState("idle");
      }, 1500);
    },
    [tripId, showToast],
  );

  const handleClick = useCallback(async () => {
    getGtag()?.("event", "trip_pass.pdf_download_rate", { trip_id: tripId });
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      fallbackToPrintTab("You're offline. Opening print view instead.");
      return;
    }

    setState("generating");
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const res = await fetch(`/api/trips/${tripId}/pdf`, {
        method: "POST",
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`http ${res.status}`);
      }

      const blob = await res.blob();
      if (isUnmountedRef.current) return;

      const objectUrl = URL.createObjectURL(blob);
      try {
        const filenameMatch = res.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/);
        const filename = filenameMatch?.[1] ?? `yuku-trip-${tripId}.pdf`;

        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }

      setState("idle");
      showToast("Your trip PDF is downloading", { variant: "success", duration: 3000 });
    } catch (err) {
      if (isUnmountedRef.current) return;
      const aborted = err instanceof Error && err.name === "AbortError";
      fallbackToPrintTab(
        aborted
          ? "Taking longer than expected. Opening print view instead."
          : "Couldn't generate PDF. Opening print view instead.",
      );
    } finally {
      clearTimeout(timeoutId);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [tripId, fallbackToPrintTab, showToast]);

  const className =
    "inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-canvas disabled:opacity-60";

  if (locked && onLockedClick) {
    return (
      <button type="button" onClick={onLockedClick} className={className} title="Unlock to download">
        PDF
      </button>
    );
  }

  const label =
    state === "generating" ? "Generating…" : state === "fallback" ? "Opening…" : "PDF";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state !== "idle"}
      className={className}
      title="Download as PDF"
      aria-busy={state === "generating"}
    >
      {label}
    </button>
  );
}
