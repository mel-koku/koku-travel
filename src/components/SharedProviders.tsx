"use client";

import { useEffect } from "react";
import { SavedProvider } from "@/context/SavedContext";
import { ToastProvider, useToast } from "@/context/ToastContext";
import { AppStateProvider } from "@/state/AppState";
import { QueryProvider } from "@/providers/QueryProvider";

function SessionExpiredListener() {
  const { showToast } = useToast();

  useEffect(() => {
    const handler = () => {
      showToast("Your session has expired.", {
        variant: "error",
        actionLabel: "Sign in",
        actionHref: "/signin",
        duration: 8000,
      });
    };
    window.addEventListener("koku:session-expired", handler);
    return () => window.removeEventListener("koku:session-expired", handler);
  }, [showToast]);

  return null;
}

export function SharedProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AppStateProvider>
        <ToastProvider>
          <SessionExpiredListener />
          <SavedProvider>{children}</SavedProvider>
        </ToastProvider>
      </AppStateProvider>
    </QueryProvider>
  );
}
