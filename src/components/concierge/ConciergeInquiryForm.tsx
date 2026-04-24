"use client";

import { useState } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export function ConciergeInquiryForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/concierge/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    }
  };

  return (
    <section
      id="inquire"
      aria-label="Contact"
      className="bg-background px-6 py-12 sm:py-20 lg:py-28"
    >
      <div className="mx-auto max-w-[560px]">
        <ScrollReveal>
          <div className="rounded-lg border border-border bg-surface p-8 shadow-[var(--shadow-elevated)] sm:p-12">
            {status === "success" ? (
              <SuccessState />
            ) : (
              <>
                <div className="text-center">
                  <p className="eyebrow-editorial mb-4 inline-block">Inquire</p>
                  <h2
                    className="mb-3 font-serif font-medium text-foreground text-balance"
                    style={{
                      fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
                      lineHeight: 1.1,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    Reach out. We&rsquo;d love to hear from you.
                  </h2>
                  <p
                    className="mx-auto mb-8 max-w-[40ch] text-foreground-secondary"
                    style={{ fontSize: "1rem", lineHeight: 1.55 }}
                  >
                    Leave your name and email. We&rsquo;ll be in touch within 2 business days.
                    No pressure, no lists, no forwarding your info anywhere.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
                  <div>
                    <label
                      htmlFor="concierge-name"
                      className="block font-sans font-medium uppercase text-foreground-secondary"
                      style={{ fontSize: "12px", letterSpacing: "0.1em", marginBottom: "0.4rem" }}
                    >
                      Your name
                    </label>
                    <input
                      id="concierge-name"
                      type="text"
                      required
                      autoComplete="name"
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="First and last"
                      disabled={status === "submitting"}
                      className="h-12 w-full rounded-md border border-border bg-background px-4 text-base text-foreground placeholder:text-stone focus:border-brand-primary focus:outline-none focus:ring-[3px] focus:ring-brand-primary/20 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="concierge-email"
                      className="block font-sans font-medium uppercase text-foreground-secondary"
                      style={{ fontSize: "12px", letterSpacing: "0.1em", marginBottom: "0.4rem" }}
                    >
                      Email
                    </label>
                    <input
                      id="concierge-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={status === "submitting"}
                      className="h-12 w-full rounded-md border border-border bg-background px-4 text-base text-foreground placeholder:text-stone focus:border-brand-primary focus:outline-none focus:ring-[3px] focus:ring-brand-primary/20 disabled:opacity-50"
                    />
                  </div>

                  {status === "error" && errorMessage && (
                    <p role="alert" className="text-sm text-error">
                      {errorMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting" || !name.trim() || !email.trim()}
                    className="mt-2 inline-flex h-14 w-full items-center justify-center rounded-lg bg-brand-primary px-6 text-[13px] font-semibold uppercase tracking-[0.1em] text-white shadow-[var(--shadow-elevated)] transition-colors hover:bg-brand-primary/90 active:scale-[0.98] disabled:opacity-60"
                  >
                    {status === "submitting" ? "Sending…" : "Send my info"}
                  </button>
                </form>

                <p className="mt-5 text-center text-xs text-foreground-secondary">
                  We read every inquiry personally. No spam, no newsletter, no third parties.
                </p>
              </>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function SuccessState() {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
        <svg
          aria-hidden="true"
          className="h-7 w-7 text-success"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="eyebrow-editorial mb-3 inline-block">Received</p>
      <h3
        className="mb-3 font-serif font-medium text-foreground text-balance"
        style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", lineHeight: 1.15, letterSpacing: "-0.005em" }}
      >
        Thanks. We&rsquo;ll be in touch.
      </h3>
      <p
        className="mx-auto max-w-[40ch] text-foreground-secondary"
        style={{ fontSize: "1rem", lineHeight: 1.55 }}
      >
        We read every inquiry personally and typically reply within 2 business days. Keep an
        eye on your inbox.
      </p>
    </div>
  );
}
