import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Koku Travel team.",
};

export default function ContactPageB() {
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
          Contact
        </h1>
        <p
          className="text-base leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          Have feedback or a question? Reach us at hello@kokutravel.com.
        </p>
      </div>
    </main>
  );
}
