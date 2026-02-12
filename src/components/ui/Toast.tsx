"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export type ToastVariant = "success" | "info" | "error";

export type ToastData = {
  id: string;
  message: string;
  variant: ToastVariant;
  actionLabel?: string;
  actionHref?: string;
  duration?: number;
};

type ToastProps = {
  toast: ToastData;
  onDismiss: (id: string) => void;
};

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "bg-semantic-success text-white",
  info: "bg-charcoal text-white",
  error: "bg-semantic-error text-white",
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const showTimeout = setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss
    const duration = toast.duration ?? 4000;
    const dismissTimeout = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, duration);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(dismissTimeout);
    };
  }, [toast.id, toast.duration, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg transition-all duration-300",
        VARIANT_STYLES[toast.variant],
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0"
      )}
    >
      <p className="text-sm font-medium flex-1">{toast.message}</p>

      {toast.actionLabel && toast.actionHref ? (
        <a
          href={toast.actionHref}
          className="text-sm font-semibold underline underline-offset-2 hover:no-underline whitespace-nowrap"
        >
          {toast.actionLabel}
        </a>
      ) : null}

      <button
        type="button"
        onClick={handleDismiss}
        className="flex h-11 w-11 items-center justify-center rounded hover:bg-white/20 transition"
        aria-label="Dismiss"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

type ToastContainerProps = {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-auto z-[1300] flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
