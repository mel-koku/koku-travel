"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { SharedProviders } from "@/components/SharedProviders";
import { LenisProvider } from "@/providers/LenisProvider";
import { HeaderC } from "@c/HeaderC";
import { FooterC } from "@c/FooterC";

const AskKokuButtonC = dynamic(
  () =>
    import("@c/features/ask-koku/AskKokuButtonC").then(
      (m) => m.AskKokuButtonC,
    ),
  { ssr: false },
);

export function LayoutWrapperC({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTripBuilder = pathname.startsWith("/c/trip-builder");
  return (
    <SharedProviders>
      <LenisProvider>
        <div className="flex min-h-[100dvh] flex-col">
          <HeaderC />
          <main className="flex-1">{children}</main>
          {!isTripBuilder && <FooterC />}
        </div>
        <AskKokuButtonC />
      </LenisProvider>
    </SharedProviders>
  );
}
