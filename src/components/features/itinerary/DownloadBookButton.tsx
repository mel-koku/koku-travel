"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DownloadBookButtonProps = {
  tripId: string;
  locked?: boolean;
  onLockedClick?: () => void;
};

/**
 * Opens the print route for a trip in a new tab. The print route
 * renders the trip as an A5 editorial book and offers a "Download PDF"
 * button that triggers the browser's native print-to-PDF dialog.
 *
 * Phase 1 uses browser print. Phase 2 will replace this with a server-
 * side Playwright API that returns a PDF stream directly.
 */
export function DownloadBookButton({ tripId, locked, onLockedClick }: DownloadBookButtonProps) {
  const [isOpening, setIsOpening] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleClick = useCallback(() => {
    window.open(`/print/trip/${tripId}`, "_blank", "noopener,noreferrer");
    setIsOpening(true);
    timerRef.current = setTimeout(() => setIsOpening(false), 2000);
  }, [tripId]);

  const className = "inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-canvas";

  if (locked && onLockedClick) {
    return (
      <button type="button" onClick={onLockedClick} className={className} title="Unlock to download">
        Book
      </button>
    );
  }

  return (
    <button type="button" onClick={handleClick} disabled={isOpening} className={className} title="Open as printable book">
      {isOpening ? "Opening\u2026" : "Book"}
    </button>
  );
}
