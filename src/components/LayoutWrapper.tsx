"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SharedProviders } from "@/components/SharedProviders";
import { LenisProvider } from "@/providers/LenisProvider";
import { PageTransition } from "@/components/PageTransition";
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar";
import type { SiteSettings } from "@/types/sanitySiteContent";

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
  const isTripBuilder = pathname.startsWith("/trip-builder");

  // Sanity Studio manages its own scroll, layout, and UI chrome
  if (isStudio) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
      <SharedProviders>
        <LenisProvider>
          <ScrollProgressBar />
          <div className="flex min-h-[100dvh] flex-col">
            <ErrorBoundary fallback={<></>}>
              <Header />
            </ErrorBoundary>
            <ErrorBoundary>
              <main id="main-content" className="flex-1">
                <PageTransition>{children}</PageTransition>
              </main>
            </ErrorBoundary>
            {!isTripBuilder && (
              <ErrorBoundary fallback={<></>}>
                <Footer settings={siteSettings} />
              </ErrorBoundary>
            )}
          </div>
          <AskKokuButton />
        </LenisProvider>
      </SharedProviders>
    </ThemeProvider>
  );
}
