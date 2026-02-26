"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

export type MobileBottomSheetProps = {
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  minHeight?: number;
  maxHeight?: string;
};

const DEFAULT_MIN_HEIGHT = 60;

export function MobileBottomSheet({
  children,
  isOpen: controlledIsOpen,
  onToggle,
  minHeight = DEFAULT_MIN_HEIGHT,
  maxHeight = "70vh",
}: MobileBottomSheetProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledIsOpen ?? internalIsOpen;

  const handleToggle = useCallback(() => {
    const newState = !isOpen;
    setInternalIsOpen(newState);
    onToggle?.(newState);
  }, [isOpen, onToggle]);

  // Handle touch/drag interactions
  const handleDragStart = useCallback(
    (clientY: number) => {
      setIsDragging(true);
      setStartY(clientY);
    },
    []
  );

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return;

      const delta = clientY - startY;

      // Only allow dragging down when open, up when closed
      if (isOpen && delta > 0) {
        setCurrentTranslate(delta);
      } else if (!isOpen && delta < 0) {
        setCurrentTranslate(delta);
      }
    },
    [isDragging, startY, isOpen]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    // Determine if we should toggle based on drag distance
    const threshold = 50;
    if (isOpen && currentTranslate > threshold) {
      setInternalIsOpen(false);
      onToggle?.(false);
    } else if (!isOpen && currentTranslate < -threshold) {
      setInternalIsOpen(true);
      onToggle?.(true);
    }

    setCurrentTranslate(0);
  }, [isDragging, currentTranslate, isOpen, onToggle]);

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleDragStart(e.clientY);
    },
    [handleDragStart]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleDragMove(e.clientY);
    },
    [handleDragMove]
  );

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleDragStart(e.touches[0]?.clientY ?? 0);
    },
    [handleDragStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleDragMove(e.touches[0]?.clientY ?? 0);
    },
    [handleDragMove]
  );

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Global mouse events for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculate transform based on state
  const transform = isDragging
    ? `translateY(${currentTranslate}px)`
    : isOpen
    ? "translateY(0)"
    : `translateY(calc(100% - ${minHeight}px))`;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/30 transition-opacity lg:hidden"
          onClick={handleToggle}
        />
      )}

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-background pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform lg:hidden",
          isDragging && "transition-none"
        )}
        style={{
          maxHeight,
          transform,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div
          className="flex h-6 cursor-grab items-center justify-center active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-border px-4 pb-2"
          onClick={handleToggle}
        >
          <div className="flex items-center gap-2">
            <svg
              className={cn(
                "h-5 w-5 text-stone transition-transform",
                isOpen && "rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
            <span className="text-sm font-semibold text-foreground">
              {isOpen ? "Preview" : "Show Preview"}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}

/**
 * Floating preview toggle button for mobile.
 * Shows when the bottom sheet is collapsed.
 */
export type PreviewToggleButtonProps = {
  onClick: () => void;
  isOpen: boolean;
};

export function PreviewToggleButton({ onClick, isOpen }: PreviewToggleButtonProps) {
  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 rounded-full bg-brand-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg transition hover:bg-brand-primary/90 active:scale-[0.98] lg:hidden"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
      Preview
    </button>
  );
}
