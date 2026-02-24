"use client";

import dynamic from "next/dynamic";
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
  return (
    <SharedProviders>
      <LenisProvider>
        <div className="flex min-h-[100dvh] flex-col">
          <HeaderB />
          <main className="flex-1">{children}</main>
          <FooterB />
        </div>
        <AskKokuButtonB />
      </LenisProvider>
    </SharedProviders>
  );
}
