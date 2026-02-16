"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WishlistProvider } from "@/context/WishlistContext";
import { ToastProvider } from "@/context/ToastContext";
import { AppStateProvider } from "@/state/AppState";
import { QueryProvider } from "@/providers/QueryProvider";
import { LenisProvider } from "@/providers/LenisProvider";
import { CursorProvider } from "@/providers/CursorProvider";
import { PageTransition } from "@/components/PageTransition";
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar";
import type { SiteSettings } from "@/types/sanitySiteContent";

// Lazy-load CustomCursor (~40KB) — only needed on desktop, not critical path
const CustomCursor = dynamic(
  () => import("@/components/ui/CustomCursor").then((m) => m.CustomCursor),
  { ssr: false },
);

// Lazy-load Ask Koku chat FAB — not critical path
const AskKokuButton = dynamic(
  () =>
    import("@/components/features/ask-koku/AskKokuButton").then(
      (m) => m.AskKokuButton,
    ),
  { ssr: false },
);

export function LayoutWrapper({
  children,
  siteSettings,
}: {
  children: React.ReactNode;
  siteSettings?: SiteSettings;
}) {
  const pathname = usePathname();
  const isStudio = pathname.startsWith("/studio");

  // Sanity Studio manages its own scroll, layout, and UI chrome —
  // skip Lenis, Header, Footer, PageTransition, and cursor overlay
  if (isStudio) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
      <QueryProvider>
        <AppStateProvider>
          <ToastProvider>
            <WishlistProvider>
              <LenisProvider>
                <CursorProvider>
                  <ScrollProgressBar />
                  <div className="flex min-h-screen flex-col">
                    <Header />
                    <ErrorBoundary>
                      <main id="main-content" className="flex-1">
                        <PageTransition>{children}</PageTransition>
                      </main>
                    </ErrorBoundary>
                    <Footer settings={siteSettings} />
                  </div>
                  <CustomCursor />
                  <AskKokuButton />
                </CursorProvider>
              </LenisProvider>
            </WishlistProvider>
          </ToastProvider>
        </AppStateProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
