import type { Metadata } from "next";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const metadata: Metadata = {
  title: "Privacy Policy | Yuku Japan",
  description:
    "How Yuku Japan collects, uses, and protects your personal information when you use our trip planning service.",
  alternates: {
    canonical: "/privacy",
  },
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <ScrollReveal>
      <h2 className={cn(typography({ intent: "editorial-h2" }), "mb-6")}>
        {children}
      </h2>
    </ScrollReveal>
  );
}

function Paragraph({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <ScrollReveal delay={delay}>
      <p className={cn(typography({ intent: "utility-body" }), "text-foreground-secondary")}>
        {children}
      </p>
    </ScrollReveal>
  );
}

function BulletList({ items, delay = 0 }: { items: React.ReactNode[]; delay?: number }) {
  return (
    <ScrollReveal delay={delay}>
      <ul className="list-disc space-y-2 pl-5">
        {items.map((item, i) => (
          <li
            key={i}
            className={cn(typography({ intent: "utility-body" }), "text-foreground-secondary")}
          >
            {item}
          </li>
        ))}
      </ul>
    </ScrollReveal>
  );
}

function SubHeading({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <ScrollReveal delay={delay}>
      <h3 className={cn(typography({ intent: "editorial-h3" }), "mb-3 mt-8")}>
        {children}
      </h3>
    </ScrollReveal>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-[100dvh]">
      {/* ── Header ───────────────────────────────── */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <ScrollReveal>
            <p className="eyebrow-editorial mb-4">Legal</p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className={cn(typography({ intent: "editorial-h1" }), "mb-6")}>
              Privacy Policy
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <p className={cn(typography({ intent: "utility-body" }), "text-foreground-secondary")}>
              Effective date: April 12, 2026
            </p>
          </ScrollReveal>
          <Paragraph delay={0.24}>
            Yuku Japan (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates yukujapan.com. This
            policy explains what information we collect, how we use it, and what
            choices you have.
          </Paragraph>
        </div>
      </section>

      {/* ── Information We Collect ────────────────── */}
      <section className="bg-canvas px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>Information we collect</SectionHeading>

          <SubHeading>Account information</SubHeading>
          <Paragraph delay={0.08}>
            When you sign in with Google or a magic link, we receive your name,
            email address, and profile photo. We use this to create and maintain
            your account.
          </Paragraph>

          <SubHeading delay={0.12}>Trip and preference data</SubHeading>
          <Paragraph delay={0.16}>
            When you use the trip builder, we store your selected destinations,
            travel dates, style preferences, generated itineraries, saved
            locations, and guide bookmarks. This data powers your personalized
            trip plans.
          </Paragraph>

          <SubHeading delay={0.2}>Chat content</SubHeading>
          <Paragraph delay={0.24}>
            Conversations with Ask Yuku are processed by Google Gemini to
            generate responses. We do not use your chat content for advertising
            or sell it to third parties.
          </Paragraph>

          <SubHeading delay={0.28}>Payment information</SubHeading>
          <Paragraph delay={0.32}>
            Trip Pass purchases are processed by Stripe. We never see or store
            your full card number. We retain only your purchase status and
            transaction identifiers.
          </Paragraph>

          <SubHeading delay={0.36}>Usage data</SubHeading>
          <Paragraph delay={0.4}>
            If you consent, we collect anonymized usage data through Google
            Analytics (page views, feature interactions, performance metrics).
            Analytics are fully consent-gated and do not run until you opt in.
          </Paragraph>
        </div>
      </section>

      {/* ── How We Use Your Information ───────────── */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>How we use your information</SectionHeading>
          <BulletList
            delay={0.08}
            items={[
              "Generate and refine personalized trip itineraries",
              "Save your favorites, bookmarks, and trip history",
              "Process Trip Pass payments and verify purchase status",
              "Respond to your questions through Ask Yuku",
              "Improve the service based on aggregated, anonymized usage patterns",
              "Send transactional emails (account verification, purchase receipts)",
            ]}
          />
        </div>
      </section>

      {/* ── Third-Party Services ─────────────────── */}
      <section className="bg-canvas px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>Third-party services</SectionHeading>
          <Paragraph delay={0.08}>
            We rely on trusted third-party services to operate Yuku. Each
            processes only the data necessary for its function.
          </Paragraph>
          <BulletList
            delay={0.16}
            items={[
              <><strong className="text-foreground">Supabase</strong> &mdash; authentication and database hosting</>,
              <><strong className="text-foreground">Stripe</strong> &mdash; payment processing for Trip Pass purchases</>,
              <><strong className="text-foreground">Google Gemini</strong> &mdash; AI-powered itinerary generation and chat</>,
              <><strong className="text-foreground">Google Analytics</strong> &mdash; anonymized usage analytics (consent-gated)</>,
              <><strong className="text-foreground">Google Places</strong> &mdash; location photos, reviews, and business hours</>,
              <><strong className="text-foreground">Mapbox</strong> &mdash; interactive maps and geocoding</>,
              <><strong className="text-foreground">NAVITIME</strong> &mdash; Japanese transit routing and schedule data</>,
            ]}
          />
          <Paragraph delay={0.24}>
            We do not sell, rent, or trade your personal information to any third
            party for marketing or advertising purposes.
          </Paragraph>
        </div>
      </section>

      {/* ── Cookies & Local Storage ──────────────── */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>Cookies and local storage</SectionHeading>
          <BulletList
            delay={0.08}
            items={[
              <><strong className="text-foreground">Authentication cookies</strong> &mdash; maintain your signed-in session. Essential for the service to work.</>,
              <><strong className="text-foreground">Local storage</strong> &mdash; stores trip preferences and draft data on your device so your work persists between visits, even before you sign in.</>,
              <><strong className="text-foreground">Analytics cookies</strong> &mdash; set by Google Analytics only after you consent. You can withdraw consent at any time.</>,
            ]}
          />
          <Paragraph delay={0.16}>
            We do not use any third-party advertising cookies or tracking pixels.
          </Paragraph>
        </div>
      </section>

      {/* ── Data Retention ───────────────────────── */}
      <section className="bg-canvas px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>Data retention</SectionHeading>
          <Paragraph delay={0.08}>
            We keep your account and trip data for as long as your account is
            active. If you delete your account, we remove your personal data
            within 30 days, except where retention is required by law (e.g.,
            payment records for tax compliance).
          </Paragraph>
          <Paragraph delay={0.16}>
            Guest data stored in your browser&apos;s local storage remains on your
            device until you clear it.
          </Paragraph>
        </div>
      </section>

      {/* ── Your Rights ──────────────────────────── */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>Your rights</SectionHeading>
          <Paragraph delay={0.08}>
            You can request access to, correction of, or deletion of your
            personal data at any time by emailing us. We will respond within 30
            days.
          </Paragraph>
          <BulletList
            delay={0.16}
            items={[
              "Access a copy of the personal data we hold about you",
              "Correct inaccurate information in your account",
              "Delete your account and associated data",
              "Withdraw analytics consent at any time",
            ]}
          />
        </div>
      </section>

      {/* ── Children's Privacy ───────────────────── */}
      <section className="bg-canvas px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>Children&apos;s privacy</SectionHeading>
          <Paragraph delay={0.08}>
            Yuku is not directed at children under 13. We do not knowingly
            collect personal information from children. If you believe a child
            has provided us with personal data, please contact us and we will
            delete it promptly.
          </Paragraph>
        </div>
      </section>

      {/* ── Changes ──────────────────────────────── */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>Changes to this policy</SectionHeading>
          <Paragraph delay={0.08}>
            We may update this policy from time to time. When we do, we will
            revise the effective date at the top of this page. Continued use of
            Yuku after changes constitutes acceptance of the updated policy.
          </Paragraph>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────── */}
      <section className="bg-canvas px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>Contact us</SectionHeading>
          <Paragraph delay={0.08}>
            If you have questions about this privacy policy or how we handle your
            data, reach us at{" "}
            <a
              href="mailto:hello@yukujapan.com"
              className="text-foreground underline decoration-brand-primary/40 underline-offset-4 transition-colors hover:text-brand-primary"
            >
              hello@yukujapan.com
            </a>
            .
          </Paragraph>
        </div>
      </section>
    </main>
  );
}
