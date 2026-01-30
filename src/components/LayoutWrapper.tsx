"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WishlistProvider } from "@/context/WishlistContext";
import { ToastProvider } from "@/context/ToastContext";
import { AppStateProvider } from "@/state/AppState";
import { QueryProvider } from "@/providers/QueryProvider";

export function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AppStateProvider>
        <ToastProvider>
          <WishlistProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <ErrorBoundary>
                <main className="flex-1">{children}</main>
              </ErrorBoundary>
              <Footer />
            </div>
          </WishlistProvider>
        </ToastProvider>
      </AppStateProvider>
    </QueryProvider>
  );
}

