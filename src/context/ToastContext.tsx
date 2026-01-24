"use client";

import { createContext, useCallback, useContext, useState, useMemo } from "react";
import { ToastContainer, type ToastData, type ToastVariant } from "@/components/ui/Toast";

type ShowToastOptions = {
  variant?: ToastVariant;
  actionLabel?: string;
  actionHref?: string;
  duration?: number;
};

type ToastContextType = {
  showToast: (message: string, options?: ShowToastOptions) => void;
};

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((message: string, options?: ShowToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastData = {
      id,
      message,
      variant: options?.variant ?? "success",
      actionLabel: options?.actionLabel,
      actionHref: options?.actionHref,
      duration: options?.duration,
    };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<ToastContextType>(
    () => ({ showToast }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
