import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Koku Travel privacy policy and data practices.",
};

export default function PrivacyPageC() {
  return (
    <main
      className="min-h-[100dvh]"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-24 sm:py-32 lg:py-48">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Legal
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
          Privacy
        </h1>
        <p
          className="mt-6 max-w-2xl text-[15px] leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          We collect only what we need to plan your trip. No tracking, no ads,
          no selling your data.
        </p>
      </div>
    </main>
  );
}
