"use client";

import { MutableRefObject, ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  'input:not([type="hidden"]):not([disabled])',
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null> | MutableRefObject<HTMLElement | null>;
  closeOnBackdrop?: boolean;
};

const isBrowser = typeof window !== "undefined";

export function Modal(props: ModalProps) {
  const {
    isOpen,
    onClose,
    title,
    description,
    children,
    className,
    panelClassName,
    initialFocusRef,
    closeOnBackdrop = true,
  } = props;

  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isBrowser || !isOpen) return undefined;

    previouslyFocusedElement.current = document.activeElement as HTMLElement | null;

    const focusInitial = () => {
      const target =
        initialFocusRef?.current ??
        (panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTORS) ?? null);
      target?.focus({ preventScroll: true });
      if (!target) {
        panelRef.current?.focus({ preventScroll: true });
      }
    };

    const raf = window.requestAnimationFrame(focusInitial);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.cancelAnimationFrame(raf);
      document.body.style.overflow = originalOverflow;
      previouslyFocusedElement.current?.focus({ preventScroll: true });
      previouslyFocusedElement.current = null;
    };
  }, [isOpen, initialFocusRef]);

  useEffect(() => {
    if (!isBrowser || !isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const focusable = panelRef.current
          ? Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
              (el) => el.offsetParent !== null || el === document.activeElement,
            )
          : [];

        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }

        const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
        const lastIndex = focusable.length - 1;

        if (event.shiftKey) {
          if (currentIndex <= 0) {
            focusable[lastIndex].focus({ preventScroll: true });
            event.preventDefault();
          }
        } else {
          if (currentIndex === -1 || currentIndex >= lastIndex) {
            focusable[0].focus({ preventScroll: true });
            event.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isBrowser || !isOpen) return undefined;

    const handleFocus = (event: FocusEvent) => {
      if (!panelRef.current) return;
      if (panelRef.current.contains(event.target as Node)) return;

      const firstFocusable =
        panelRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTORS) ?? panelRef.current;
      firstFocusable.focus({ preventScroll: true });
    };

    document.addEventListener("focus", handleFocus, true);
    return () => {
      document.removeEventListener("focus", handleFocus, true);
    };
  }, [isOpen]);

  if (!isBrowser || !isOpen) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-1200 overflow-y-auto">
      <div
        ref={backdropRef}
        className={cn(
          "flex min-h-full items-start justify-center bg-black/50 backdrop-blur-sm px-4 py-8 sm:py-12",
          className,
        )}
        role="presentation"
        onMouseDown={handleBackdropClick}
      >
        <div
          ref={panelRef}
          className={cn(
            "relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
            "max-h-[calc(100vh-6rem)] overflow-y-auto sm:p-8",
            "transform transition-transform duration-200 ease-out",
            panelClassName,
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            aria-label="Close dialog"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18 18 6" />
            </svg>
          </button>

          {title ? (
            <div className="flex flex-col gap-2">
              <h2 id={titleId} className="text-2xl font-semibold text-gray-900">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="text-sm text-gray-600">
                  {description}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

Modal.displayName = "Modal";


