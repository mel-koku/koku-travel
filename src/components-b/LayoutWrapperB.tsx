"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { SharedProviders } from "@/components/SharedProviders";
import { LenisProvider } from "@/providers/LenisProvider";
import { HeaderB } from "@b/HeaderB";
import { FooterB } from "@b/FooterB";

const AskKokuButtonB = dynamic(
  () =>
    import("@b/features/ask-koku/AskKokuButtonB").then(
      (m) => m.AskKokuButtonB,
    ),
  { ssr: false },
);

export function LayoutWrapperB({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTripBuilder = pathname.startsWith("/b/trip-builder");

  return (
    <SharedProviders>
      <LenisProvider>
        <div className="flex min-h-[100dvh] flex-col">
          <HeaderB />
          <main className="flex-1">{children}</main>
          {!isTripBuilder && <FooterB />}
        </div>
        <AskKokuButtonB />
      </LenisProvider>
    </SharedProviders>
  );
}
