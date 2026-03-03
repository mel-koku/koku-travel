import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Koku",
  description:
    "Koku is a Japan trip planning tool built for curious travelers.",
};

export default function AboutPageB() {
  return (
    <main
      className="min-h-[100dvh] px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="mx-auto max-w-2xl">
        <h1
          className="text-3xl font-bold sm:text-4xl mb-6"
          style={{ color: "var(--foreground)" }}
        >
          About Koku
        </h1>
        <p
          className="text-base leading-relaxed"
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
