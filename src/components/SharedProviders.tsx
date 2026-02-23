"use client";

import { SavedProvider } from "@/context/SavedContext";
import { ToastProvider } from "@/context/ToastContext";
import { AppStateProvider } from "@/state/AppState";
import { QueryProvider } from "@/providers/QueryProvider";

export function SharedProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AppStateProvider>
        <ToastProvider>
          <SavedProvider>{children}</SavedProvider>
        </ToastProvider>
      </AppStateProvider>
    </QueryProvider>
  );
}
