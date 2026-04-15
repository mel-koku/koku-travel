"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/context/ToastContext";

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
  const { showToast } = useToast();

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const fallbackToPrintTab = useCallback(
    (message: string) => {
      setState("fallback");
      showToast(message, { variant: "info", duration: 4000 });
      window.open(`/print/trip/${tripId}`, "_blank", "noopener,noreferrer");
      resetTimerRef.current = setTimeout(() => setState("idle"), 1500);
    },
    [tripId, showToast],
  );

  const handleClick = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      fallbackToPrintTab("You're offline — opening print view instead");
      return;
    }

    setState("generating");
    const controller = new AbortController();
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
      const objectUrl = URL.createObjectURL(blob);
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
      URL.revokeObjectURL(objectUrl);

      setState("idle");
      showToast("Your book is downloading", { variant: "success", duration: 3000 });
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      fallbackToPrintTab(
        aborted
          ? "Taking longer than expected — opening print view instead"
          : "Couldn't generate PDF — opening print view instead",
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }, [tripId, fallbackToPrintTab, showToast]);

  const className =
    "inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-canvas disabled:opacity-60";

  if (locked && onLockedClick) {
    return (
      <button type="button" onClick={onLockedClick} className={className} title="Unlock to download">
        Book
      </button>
    );
  }

  const label =
    state === "generating" ? "Generating…" : state === "fallback" ? "Opening…" : "Book";

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
