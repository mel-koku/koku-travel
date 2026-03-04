"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { easeReveal } from "@/lib/motion";
import { useInquirySubmit } from "@/hooks/useInquirySubmit";
import { useAuthState } from "@/components/ui/IdentityBadge";
import type { Person } from "@/types/person";

type Props = {
  person: Person;
};

export function InquiryForm({ person }: Props) {
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
      <div className="rounded-xl border border-border bg-canvas p-5 text-center">
        <p className="text-sm text-foreground-secondary">
          Sign in to send a booking inquiry.
        </p>
        <a
          href="/signin"
          className="mt-3 inline-flex h-11 items-center rounded-xl bg-brand-primary px-6 text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98]"
        >
          Sign in
        </a>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-5 text-center">
        <svg className="mx-auto h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-3 text-sm font-medium text-foreground">Inquiry sent</p>
        <p className="mt-1 text-xs text-foreground-secondary">
          {person.name} will get back to you at {submittedEmail || "your email"}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-canvas p-5">
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98]"
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
            transition={{
              ease: [...easeReveal] as [number, number, number, number],
            }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
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

            <div>
              <label className="eyebrow-editorial block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Anything you'd like us to know"
                rows={3}
                maxLength={2000}
                className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="h-11 flex-1 rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending || !email}
                className="h-11 flex-1 rounded-xl bg-brand-primary text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
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
