"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PreviewBanner from "@/components/PreviewBanner";
import { WishlistProvider } from "@/context/WishlistContext";
import { AppStateProvider } from "@/state/AppState";

export function LayoutWrapper({
  children,
  showPreviewBanner,
}: {
  children: React.ReactNode;
  showPreviewBanner: boolean;
}) {
  const pathname = usePathname();
  
  // Check if this is a studio route synchronously to avoid hydration mismatch
  const isStudioRouteSync = pathname?.startsWith("/studio") ?? false;
  
  const [isMounted, setIsMounted] = useState(false);

  // Only update state on client after mount to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Studio routes should render without the standard layout wrapper
  // Use isMounted to ensure consistent initial render
  // Always render the same structure on server and initial client render
  if (isMounted && isStudioRouteSync) {
    return <>{children}</>;
  }

  return (
    <AppStateProvider>
      <WishlistProvider>
        <div className="flex min-h-screen flex-col" suppressHydrationWarning>
          {showPreviewBanner ? <PreviewBanner /> : null}
          <Header />
          <main className="flex-1" suppressHydrationWarning>{children}</main>
          <Footer />
        </div>
      </WishlistProvider>
    </AppStateProvider>
  );
}

