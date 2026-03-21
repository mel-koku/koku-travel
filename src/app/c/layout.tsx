import { Plus_Jakarta_Sans } from "next/font/google";
import { LayoutWrapperC } from "@c/LayoutWrapperC";
import { VariantProvider } from "@/lib/variant/VariantContext";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export default function VariantCLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <VariantProvider variant="c">
      <div
        data-variant="c"
        className={`${plusJakarta.variable} min-h-[100dvh]`}
        style={{
          fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <LayoutWrapperC>{children}</LayoutWrapperC>
      </div>
    </VariantProvider>
  );
}
