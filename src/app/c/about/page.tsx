import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Koku",
  description:
    "Koku is a Japan trip planning tool built for curious travelers.",
};

export default function AboutPageC() {
  return (
    <main
      className="min-h-[100dvh]"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-24 sm:py-32 lg:py-48">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          About
        </p>
        <h1
          className="mt-4 leading-[1.1]"
          style={{
            fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
            fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--foreground)",
          }}
        >
          About Koku
        </h1>
        <p
          className="mt-6 max-w-2xl text-[15px] leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          Koku is a Japan trip planning tool built for curious travelers. We
          combine local knowledge with smart planning to help you experience
          Japan beyond the guidebook.
        </p>
      </div>
    </main>
  );
}
