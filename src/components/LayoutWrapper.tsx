"use client";

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
  const isStudioRoute = pathname?.startsWith("/studio") ?? false;

  // Studio routes should render without the standard layout wrapper
  if (isStudioRoute) {
    return <>{children}</>;
  }

  return (
    <AppStateProvider>
      <WishlistProvider>
        <div className="flex min-h-screen flex-col" suppressHydrationWarning>
          {showPreviewBanner ? <PreviewBanner /> : null}
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </WishlistProvider>
    </AppStateProvider>
  );
}

