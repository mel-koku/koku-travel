"use client";

import { useState } from "react";
import { useInquirySubmit } from "@/hooks/useInquirySubmit";
import { useAuthState } from "@/components/ui/IdentityBadge";
import type { Person } from "@/types/person";

type Props = {
  person: Person;
  prefilledDate?: string; // YYYY-MM-DD
};

export function InquiryForm({ person, prefilledDate }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const { isSignedIn } = useAuthState();
  const mutation = useInquirySubmit();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState(prefilledDate ?? "");
  const [endDate, setEndDate] = useState("");
  const [groupSize, setGroupSize] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    mutation.mutate(
      {
        personId: person.id,
        personSlug: person.slug,
        contactEmail: email,
        preferredDatesStart: startDate || undefined,
        preferredDatesEnd: endDate || undefined,
        groupSize: groupSize ? parseInt(groupSize, 10) : undefined,
        message: message || undefined,
      },
      {
        onSuccess: () => {
          setSubmittedEmail(email);
          setSubmitted(true);
        },
      }
    );
  };

  if (!isSignedIn) {
    return (
      <div className="rounded-xl border border-border bg-canvas p-5 text-center">
        <p className="text-sm font-medium text-foreground">
          Request a booking with {person.name.split(" ")[0]}
        </p>
        <p className="mt-1 text-sm text-foreground-secondary">
          Sign in to send a booking inquiry.
        </p>
        <a
          href="/signin"
          className="mt-4 inline-flex h-11 items-center rounded-xl bg-brand-primary px-6 text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98]"
        >
          Sign in
        </a>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-5 text-center">
        <svg
          className="mx-auto h-8 w-8 text-success"
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
        <p className="mt-3 text-sm font-medium text-foreground">Inquiry sent</p>
        <p className="mt-1 text-xs text-foreground-secondary">
          {person.name.split(" ")[0]} will get back to you at{" "}
          {submittedEmail || "your email"}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-canvas p-5">
      <p className="text-sm font-semibold text-foreground">
        Request a booking
      </p>
      <p className="mt-0.5 text-xs text-foreground-secondary">
        {person.name.split(" ")[0]} will reply to confirm availability.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="eyebrow-editorial block">Your email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
        </div>

        <div>
          <label className="eyebrow-editorial block">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Tell ${person.name.split(" ")[0]} what you have in mind`}
            rows={3}
            maxLength={2000}
            className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
        </div>

        {/* Optional details toggle */}
        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-foreground-secondary hover:text-foreground"
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform ${showOptional ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
          {showOptional ? "Hide" : "Add"} dates &amp; group size
        </button>

        {showOptional && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="eyebrow-editorial block">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>
              <div>
                <label className="eyebrow-editorial block">End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>
            </div>
            <div>
              <label className="eyebrow-editorial block">Group size</label>
              <input
                type="number"
                min={1}
                max={100}
                value={groupSize}
                onChange={(e) => setGroupSize(e.target.value)}
                placeholder="1"
                className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending || !email}
          className="h-11 w-full rounded-xl bg-brand-primary text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {mutation.isPending ? "Sending…" : "Send Inquiry"}
        </button>
      </form>
    </div>
  );
}
