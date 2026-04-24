import type { Metadata } from "next";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";
import { DEFAULT_OG_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/seo/defaults";

export const metadata: Metadata = {
  title: "Contact | Yuku Japan",
  description:
    "Get in touch with Yuku Japan. Have feedback or a question? Reach us at hello@yukujapan.com.",
  alternates: { canonical: "/contact" },
  openGraph: {
    images: DEFAULT_OG_IMAGES,
    title: "Contact | Yuku Japan",
    description:
      "Get in touch with Yuku Japan. Have feedback or a question? Reach us at hello@yukujapan.com.",
    url: "/contact",
    siteName: "Yuku Japan",
    type: "website",
  },
  twitter: {
    images: DEFAULT_TWITTER_IMAGES,
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
        <p className="mt-4 text-foreground-secondary leading-relaxed">
          Planning a bespoke trip? Our concierge handles end-to-end coordination.{" "}
          <a href="/concierge" className="font-medium text-brand-primary hover:underline">
            Learn about Concierge →
          </a>
        </p>
      </div>
    </main>
  );
}
