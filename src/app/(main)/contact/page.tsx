import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { DEFAULT_OG_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/seo/defaults";
import { CopyEmailButton } from "./CopyEmailButton";

const EMAIL = "hello@yukujapan.com";

export const metadata: Metadata = {
  title: "Contact | Yuku Japan",
  description:
    "Get in touch with Yuku Japan. Email hello@yukujapan.com for support, press, and partnerships. Registered in Kyoto.",
  alternates: { canonical: "/contact" },
  openGraph: {
    images: DEFAULT_OG_IMAGES,
    title: "Contact | Yuku Japan",
    description:
      "Get in touch with Yuku Japan. Email hello@yukujapan.com for support, press, and partnerships. Registered in Kyoto.",
    url: "/contact",
    siteName: "Yuku Japan",
    type: "website",
  },
  twitter: {
    images: DEFAULT_TWITTER_IMAGES,
    card: "summary",
    title: "Contact | Yuku Japan",
    description:
      "Get in touch with Yuku Japan. Email hello@yukujapan.com for support, press, and partnerships.",
  },
};

const linkClass =
  "text-foreground underline decoration-brand-primary/40 underline-offset-4 transition-colors hover:text-brand-primary";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "How does Trip Pass work?",
    a: (
      <>
        Trip Pass is a one-time unlock per trip. Day 1 is free on every trip you build. When you&apos;re ready, unlock the remaining days from $19. See{" "}
        <Link href="/pricing" className={linkClass}>
          pricing
        </Link>{" "}
        for tier details.
      </>
    ),
  },
  {
    q: "Can I get a refund?",
    a: (
      <>
        Because Trip Pass is digital content delivered immediately, we&apos;re unable to offer refunds once access has been granted, except where required by law. If you hit a technical issue that blocked access, email us and we&apos;ll make it right.
      </>
    ),
  },
  {
    q: "My plans changed. Can I edit the itinerary after unlocking?",
    a: (
      <>
        Yes. Trip Pass holders get unlimited refinements on an unlocked trip. Change dates, cities, vibes, or individual activities whenever the plan shifts.
      </>
    ),
  },
  {
    q: "I want help planning, not software.",
    a: (
      <>
        Our concierge service is built for that. Tell us about your trip and we&apos;ll reply with a tailored plan.{" "}
        <Link href="/concierge" className={linkClass}>
          Start a concierge request
        </Link>
        .
      </>
    ),
  },
  {
    q: "How do I delete my account or data?",
    a: (
      <>
        Open{" "}
        <Link href="/account" className={linkClass}>
          your account
        </Link>{" "}
        and use the delete option, or email us and we&apos;ll handle it for you.
      </>
    ),
  },
  {
    q: "Press, partnerships, or affiliate inquiries?",
    a: (
      <>
        Email{" "}
        <a href={`mailto:${EMAIL}`} className={linkClass}>
          {EMAIL}
        </a>{" "}
        with &quot;Press,&quot; &quot;Partnership,&quot; or &quot;Affiliate&quot; in the subject line and we&apos;ll route it to the right person.
      </>
    ),
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-[100dvh]">
      {/* ── Hero ─────────────────────────────────── */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <ScrollReveal>
            <p className="eyebrow-editorial mb-4">Contact</p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className={cn(typography({ intent: "editorial-h1" }), "mb-6")}>
              We read every message.
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <p
              className={cn(
                typography({ intent: "utility-body" }),
                "text-foreground-secondary"
              )}
            >
              Feedback, support, press, or partnerships. Responses within two business days, often sooner.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Email ────────────────────────────────── */}
      <section className="bg-canvas px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <ScrollReveal>
            <p className="eyebrow-editorial mb-4">Email</p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <a
                href={`mailto:${EMAIL}`}
                className={cn(
                  typography({ intent: "editorial-h3" }),
                  "text-foreground underline decoration-brand-primary/40 underline-offset-4 transition-colors hover:text-brand-primary"
                )}
              >
                {EMAIL}
              </a>
              <CopyEmailButton email={EMAIL} />
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <p
              className={cn(
                typography({ intent: "utility-body-muted" }),
                "mt-4"
              )}
            >
              For press, partnerships, or affiliate inquiries, include the topic in your subject line so we can route your message faster.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Registered office ────────────────────── */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <ScrollReveal>
            <p className="eyebrow-editorial mb-6">Registered office</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <ScrollReveal delay={0.08}>
              <address className="not-italic">
                <p
                  className={cn(
                    typography({ intent: "utility-body" }),
                    "mb-1 font-medium text-foreground"
                  )}
                >
                  Yuku Japan
                </p>
                <p
                  className={cn(
                    typography({ intent: "utility-body" }),
                    "text-foreground-secondary"
                  )}
                >
                  Dai-2 Kyoto Building, Suite 402
                  <br />
                  227 Daikoku-cho, Shichijo-dori Aburanokoji Higashi-iru
                  <br />
                  Shimogyo-ku, Kyoto 600-8223
                  <br />
                  Japan
                </p>
              </address>
            </ScrollReveal>
            <ScrollReveal delay={0.16}>
              <address className="not-italic" lang="ja">
                <p
                  className={cn(
                    typography({ intent: "utility-body" }),
                    "mb-1 font-medium text-foreground"
                  )}
                >
                  Yuku Japan
                </p>
                <p
                  className={cn(
                    typography({ intent: "utility-body" }),
                    "text-foreground-secondary"
                  )}
                >
                  〒600-8223
                  <br />
                  京都府京都市下京区七条通油小路東入
                  <br />
                  大黒町227番地 第２キョートビル402
                </p>
              </address>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────── */}
      <section className="bg-canvas px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <ScrollReveal>
            <p className="eyebrow-editorial mb-4">Frequently asked</p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h2 className={cn(typography({ intent: "editorial-h2" }), "mb-8")}>
              Quick answers before you write in.
            </h2>
          </ScrollReveal>
          <div className="divide-y divide-foreground/10 border-y border-foreground/10">
            {FAQS.map((faq, i) => (
              <ScrollReveal key={faq.q} delay={0.08 * (i + 1)}>
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <span
                      className={cn(
                        typography({ intent: "utility-body" }),
                        "font-medium text-foreground"
                      )}
                    >
                      {faq.q}
                    </span>
                    <ChevronDown
                      className="h-5 w-5 shrink-0 text-foreground-secondary transition-transform duration-300 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div
                    className={cn(
                      typography({ intent: "utility-body" }),
                      "mt-3 pr-9 text-foreground-secondary"
                    )}
                  >
                    {faq.a}
                  </div>
                </details>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Concierge CTA ────────────────────────── */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <ScrollReveal>
            <p className="eyebrow-editorial mb-4">Planning a trip?</p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h2 className={cn(typography({ intent: "editorial-h2" }), "mb-6")}>
              Our concierge can help.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <p
              className={cn(
                typography({ intent: "utility-body" }),
                "mb-8 text-foreground-secondary"
              )}
            >
              Share your dates, cities, and the kind of trip you want. We&apos;ll reply with a tailored plan.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.24}>
            <Link
              href="/concierge"
              className="btn-yuku inline-flex h-12 items-center justify-center rounded-md bg-brand-primary px-8 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-colors hover:bg-brand-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              Start a concierge request
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
