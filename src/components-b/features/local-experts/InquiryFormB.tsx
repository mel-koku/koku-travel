"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInquirySubmit } from "@/hooks/useInquirySubmit";
import { useAuthState } from "@/components/ui/IdentityBadge";
import type { Person } from "@/types/person";

type Props = {
  person: Person;
};

export function InquiryFormB({ person }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const { isSignedIn } = useAuthState();
  const mutation = useInquirySubmit();

  const [email, setEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [message, setMessage] = useState("");

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
          setIsExpanded(false);
          setEmail("");
          setStartDate("");
          setEndDate("");
          setGroupSize("");
          setMessage("");
        },
      }
    );
  };

  if (!isSignedIn) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          Sign in to send a booking inquiry.
        </p>
        <a
          href="/signin"
          className="mt-3 inline-flex h-11 items-center rounded-xl bg-[var(--primary)] px-6 text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98]"
        >
          Sign in
        </a>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] p-5 text-center">
        <svg className="mx-auto h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-3 text-sm font-medium text-[var(--foreground)]">Inquiry sent</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {person.name} will get back to you at {submittedEmail || "your email"}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
          Request Booking
        </button>
      ) : (
        <AnimatePresence>
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Your email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                  Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                  End date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Group size
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={groupSize}
                onChange={(e) => setGroupSize(e.target.value)}
                placeholder="1"
                className="mt-1 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Anything you'd like us to know"
                rows={3}
                maxLength={2000}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="h-11 flex-1 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending || !email}
                className="h-11 flex-1 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {mutation.isPending ? "Sending..." : "Send Inquiry"}
              </button>
            </div>
          </motion.form>
        </AnimatePresence>
      )}
    </div>
  );
}
