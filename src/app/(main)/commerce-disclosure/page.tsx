import type { Metadata } from "next";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getCommerceDisclosureContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Commerce Disclosure | Yuku Japan",
  description:
    "Notation based on Japan's Act on Specified Commercial Transactions for Yuku Japan.",
  alternates: {
    canonical: "/commerce-disclosure",
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

function Row({ label, value, delay = 0 }: { label: string; value: React.ReactNode; delay?: number }) {
  return (
    <ScrollReveal delay={delay}>
      <div className="grid grid-cols-1 gap-1 border-b border-foreground/10 py-5 sm:grid-cols-3 sm:gap-8">
        <dt className={cn(typography({ intent: "utility-body" }), "font-medium text-foreground sm:col-span-1")}>
          {label}
        </dt>
        <dd className={cn(typography({ intent: "utility-body" }), "text-foreground-secondary sm:col-span-2")}>
          {value}
        </dd>
      </div>
    </ScrollReveal>
  );
}

export default async function CommerceDisclosurePage() {
  const content = await getCommerceDisclosureContent();

  const businessName = content?.businessName ?? "Yuku Japan";
  const representative = content?.representative ?? "Mel Jun Picardal";
  const address = content?.address;
  const email = content?.email ?? "hello@yukujapan.com";
  const phone = content?.phone;
  const businessType = content?.businessType ?? "Online travel planning platform (sole proprietor)";
  const serviceDescription = content?.serviceDescription ?? "Yuku Japan is a digital travel planning service providing AI-generated itineraries, curated guides, and destination content for travel in Japan.";
  const pricingDescription = content?.pricingDescription ?? "Trip Pass: displayed at checkout prior to purchase. All prices are shown in Japanese Yen (JPY) inclusive of applicable taxes.";
  const paymentMethods = content?.paymentMethods ?? "Credit card and debit card (Visa, Mastercard, American Express, JCB) via Stripe.";
  const paymentTiming = content?.paymentTiming ?? "Payment is charged at the time of purchase.";
  const deliveryDescription = content?.deliveryDescription ?? "Digital access is granted immediately upon successful payment confirmation. No physical goods are shipped.";
  const cancellationPolicy = content?.cancellationPolicy ?? "Because Yuku Japan provides digital content that is made available immediately upon purchase, we are unable to offer refunds once access has been granted, except where required by applicable law.";
  const cancellationContact = content?.cancellationContact ?? "If you experience a technical issue that prevents access to a purchased service, please contact us and we will work to resolve it promptly.";

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
              Commerce Disclosure
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <p className={cn(typography({ intent: "utility-body" }), "text-foreground-secondary")}>
              特定商取引法に基づく表記
            </p>
          </ScrollReveal>
          <Paragraph delay={0.24}>
            The following disclosures are provided in accordance with Japan&apos;s
            Act on Specified Commercial Transactions (特定商取引法).
          </Paragraph>
        </div>
      </section>

      {/* ── Business Information ──────────────────── */}
      <section className="bg-canvas px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>Business information</SectionHeading>
          <dl className="divide-foreground/10">
            <Row label="Business name" value={businessName} delay={0.04} />
            <Row label="Representative" value={representative} delay={0.08} />
            <Row
              label="Address"
              value={
                address ? (
                  <span style={{ whiteSpace: "pre-line" }}>{address}</span>
                ) : (
                  <span className="italic text-foreground-secondary/60">
                    To be updated shortly.
                  </span>
                )
              }
              delay={0.12}
            />
            <Row
              label="Email"
              value={
                <a
                  href={`mailto:${email}`}
                  className="text-foreground underline decoration-brand-primary/40 underline-offset-4 transition-colors hover:text-brand-primary"
                >
                  {email}
                </a>
              }
              delay={0.16}
            />
            {phone && (
              <Row label="Phone" value={phone} delay={0.2} />
            )}
            <Row label="Business type" value={businessType} delay={phone ? 0.24 : 0.2} />
          </dl>
        </div>
      </section>

      {/* ── Service & Pricing ─────────────────────── */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>Service and pricing</SectionHeading>
          <dl className="divide-foreground/10">
            <Row label="Service" value={serviceDescription} delay={0.04} />
            <Row label="Price" value={pricingDescription} delay={0.08} />
            <Row label="Payment methods" value={paymentMethods} delay={0.12} />
            <Row label="Payment timing" value={paymentTiming} delay={0.16} />
            <Row label="Service delivery" value={deliveryDescription} delay={0.2} />
          </dl>
        </div>
      </section>

      {/* ── Cancellation & Returns ───────────────── */}
      <section className="bg-canvas px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>Cancellations and returns</SectionHeading>
          <Paragraph delay={0.08}>{cancellationPolicy}</Paragraph>
          <Paragraph delay={0.16}>
            {cancellationContact}{" "}
            <a
              href={`mailto:${email}`}
              className="text-foreground underline decoration-brand-primary/40 underline-offset-4 transition-colors hover:text-brand-primary"
            >
              {email}
            </a>
          </Paragraph>
        </div>
      </section>

      {/* ── Stripe Data Disclosure ───────────────── */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>Payment processing and data</SectionHeading>
          <Paragraph delay={0.08}>
            We use Stripe for payment processing, analytics, and related business
            services. Stripe may collect personal data including via cookies and
            similar technologies. The personal data Stripe collects may include
            transactional data and identifying information about devices that
            connect to its services. Stripe&apos;s use of your data is governed by
            their{" "}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline decoration-brand-primary/40 underline-offset-4 transition-colors hover:text-brand-primary"
            >
              Privacy Policy
            </a>
            .
          </Paragraph>
          <Paragraph delay={0.16}>
            We never see or store your full card number. Payment data is handled
            entirely by Stripe and is not retained on Yuku Japan servers.
          </Paragraph>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────── */}
      <section className="bg-canvas px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <SectionHeading>Contact</SectionHeading>
          <Paragraph delay={0.08}>
            For questions about this disclosure or any transaction, contact us at{" "}
            <a
              href={`mailto:${email}`}
              className="text-foreground underline decoration-brand-primary/40 underline-offset-4 transition-colors hover:text-brand-primary"
            >
              {email}
            </a>
            . We aim to respond within 2 business days.
          </Paragraph>
        </div>
      </section>
    </main>
  );
}
