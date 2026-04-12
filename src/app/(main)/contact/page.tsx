import type { Metadata } from "next";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Contact | Yuku Japan",
  description:
    "Get in touch with Yuku Japan. Have feedback or a question? Reach us at hello@yukujapan.com.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | Yuku Japan",
    description:
      "Get in touch with Yuku Japan. Have feedback or a question? Reach us at hello@yukujapan.com.",
    url: "/contact",
    siteName: "Yuku Japan",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Contact | Yuku Japan",
    description:
      "Get in touch with Yuku Japan. Have feedback or a question? Reach us at hello@yukujapan.com.",
  },
};

export default function ContactPage() {
  return (
    <main className="min-h-[100dvh] bg-background px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <h1 className={cn(typography({ intent: "editorial-h1" }), "mb-6")}>Contact</h1>
        <p className="text-foreground-secondary leading-relaxed">
          Have feedback or a question? Reach us at hello@yukujapan.com.
        </p>
      </div>
    </main>
  );
}
