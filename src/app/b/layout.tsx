import { Inter } from "next/font/google";
import { LayoutWrapperB } from "@b/LayoutWrapperB";
import { VariantProvider } from "@/lib/variant/VariantContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export default function VariantBLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <VariantProvider variant="b">
      <div
        data-variant="b"
        className={`${inter.variable} min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]`}
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        <LayoutWrapperB>{children}</LayoutWrapperB>
      </div>
    </VariantProvider>
  );
}
