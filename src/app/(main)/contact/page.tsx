import type { Metadata } from "next";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact | Yuku Japan",
  description: "Get in touch with the Yuku team.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <main className="min-h-[100dvh]">
      {/* Hero */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <ScrollReveal>
            <p className="eyebrow-editorial mb-4">Get in Touch</p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className={cn(typography({ intent: "editorial-h1" }), "mb-4")}>
              We&apos;d love to hear from you
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <p className={cn(typography({ intent: "utility-body" }), "text-foreground-secondary")}>
              We typically respond within 48 hours.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Form */}
      <section className="bg-canvas px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <ScrollReveal>
            <ContactForm />
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
