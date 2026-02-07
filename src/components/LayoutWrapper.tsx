"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WishlistProvider } from "@/context/WishlistContext";
import { ToastProvider } from "@/context/ToastContext";
import { AppStateProvider } from "@/state/AppState";
import { QueryProvider } from "@/providers/QueryProvider";
import { LenisProvider } from "@/providers/LenisProvider";
import { CursorProvider } from "@/providers/CursorProvider";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { PageTransition } from "@/components/PageTransition";

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
            <LenisProvider>
              <CursorProvider>
                <div className="flex min-h-screen flex-col">
                  <Header />
                  <ErrorBoundary>
                    <main className="flex-1">
                      <PageTransition>{children}</PageTransition>
                    </main>
                  </ErrorBoundary>
                  <Footer />
                </div>
                <CustomCursor />
              </CursorProvider>
            </LenisProvider>
          </WishlistProvider>
        </ToastProvider>
      </AppStateProvider>
    </QueryProvider>
  );
}
