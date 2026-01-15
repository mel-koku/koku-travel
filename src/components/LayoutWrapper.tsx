"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { WishlistProvider } from "@/context/WishlistContext";
import { AppStateProvider } from "@/state/AppState";

export function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppStateProvider>
      <WishlistProvider>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </WishlistProvider>
    </AppStateProvider>
  );
}

