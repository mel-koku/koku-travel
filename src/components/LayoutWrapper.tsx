"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { MotionConfig } from "framer-motion";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SharedProviders } from "@/components/SharedProviders";
import { PageTransition } from "@/components/PageTransition";
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar";
import type { SiteSettings } from "@/types/sanitySiteContent";

// Lazy-load Ask Yuku chat FAB — not critical path
const AskYukuButton = dynamic(
  () =>
    import("@/components/features/ask-yuku/AskYukuButton").then(
      (m) => m.AskYukuButton,
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
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false} forcedTheme="light">
      {/*
       * reducedMotion="user" tells framer-motion to respect the OS-level
       * prefers-reduced-motion setting across every motion.* component
       * without each one needing to wire up useReducedMotion manually.
       *
       * LenisProvider is intentionally NOT mounted here. Smooth-scroll lerp
       * makes guides/places/dashboard feel detached from wheel input
       * (KOK-34). It is now scoped to the landing page only, where the
       * parallax benefits from the smoothing pass. Header has a native
       * scroll fallback for routes without the provider.
       */}
      <MotionConfig reducedMotion="user">
      <SharedProviders>
        {!isTripBuilder && <ScrollProgressBar />}
        <div className="flex min-h-[100dvh] flex-col">
          {!isTripBuilder && (
            <ErrorBoundary fallback={<></>}>
              <Header />
            </ErrorBoundary>
          )}
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
        {!isTripBuilder && <AskYukuButton />}
      </SharedProviders>
      </MotionConfig>
    </ThemeProvider>
  );
}
