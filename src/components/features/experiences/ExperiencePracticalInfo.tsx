"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";

type ExperiencePracticalInfoProps = {
  whatsIncluded?: string[];
  whatToBring?: string[];
  meetingPoint?: string;
  nearestStation?: string;
  bookingUrl?: string;
};

export function ExperiencePracticalInfo({
  whatsIncluded,
  whatToBring,
  meetingPoint,
  nearestStation,
  bookingUrl,
}: ExperiencePracticalInfoProps) {
  const hasContent =
    (whatsIncluded && whatsIncluded.length > 0) ||
    (whatToBring && whatToBring.length > 0) ||
    meetingPoint ||
    nearestStation ||
    bookingUrl;

  if (!hasContent) return null;

  return (
    <section className="py-12 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="font-serif text-2xl italic text-foreground mb-8 sm:text-3xl">
          Practical Information
        </h2>

        <ScrollReveal distance={30}>
          <div className="space-y-8">
            {/* What's included */}
            {whatsIncluded && whatsIncluded.length > 0 && (
              <div>
                <h3 className="eyebrow-editorial mb-3">
                  What&apos;s Included
                </h3>
                <ul className="space-y-2">
                  {whatsIncluded.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-base text-foreground-secondary"
                    >
                      <svg
                        className="mt-1 h-4 w-4 shrink-0 text-sage"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* What to bring */}
            {whatToBring && whatToBring.length > 0 && (
              <div>
                <h3 className="eyebrow-editorial mb-3">
                  What to Bring
                </h3>
                <ul className="space-y-2">
                  {whatToBring.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-base text-foreground-secondary"
                    >
                      <svg
                        className="mt-1 h-4 w-4 shrink-0 text-brand-secondary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Meeting point & station */}
            {(meetingPoint || nearestStation) && (
              <div className="rounded-xl border border-border/50 bg-surface p-6 space-y-4">
                {meetingPoint && (
                  <div>
                    <h3 className="eyebrow-editorial mb-1">
                      Meeting Point
                    </h3>
                    <p className="text-base text-foreground-secondary">
                      {meetingPoint}
                    </p>
                  </div>
                )}
                {nearestStation && (
                  <div>
                    <h3 className="eyebrow-editorial mb-1">
                      Nearest Station
                    </h3>
                    <p className="text-base text-foreground-secondary">
                      {nearestStation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Booking CTA */}
            {bookingUrl && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full sm:w-auto items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-sm font-medium text-white transition-all hover:bg-brand-primary/90"
              >
                Book This Experience
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
