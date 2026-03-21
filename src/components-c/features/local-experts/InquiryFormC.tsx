"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInquirySubmit } from "@/hooks/useInquirySubmit";
import { useAuthState } from "@/components/ui/IdentityBadge";
import { cEase } from "@c/ui/motionC";
import type { Person } from "@/types/person";

type Props = {
  person: Person;
  prefilledDate?: string;
};

export function InquiryFormC({ person, prefilledDate }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const { isSignedIn } = useAuthState();
  const mutation = useInquirySubmit();

  const [email, setEmail] = useState("");
  const [startDate, setStartDate] = useState(prefilledDate ?? "");
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

  const inputClasses =
    "mt-1 h-12 w-full border border-[var(--border)] bg-[var(--background)] px-4 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]";

  if (!isSignedIn) {
    return (
      <div className="border border-[var(--border)] bg-[var(--surface)] p-5 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          Sign in to send a booking inquiry.
        </p>
        <a
          href="/signin"
          className="mt-3 inline-flex h-11 items-center px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-colors active:scale-[0.98]"
          style={{ backgroundColor: "var(--primary)" }}
        >
          Sign in
        </a>
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        className="border p-5 text-center"
        style={{
          borderColor:
            "color-mix(in srgb, var(--success) 30%, transparent)",
          backgroundColor:
            "color-mix(in srgb, var(--success) 6%, transparent)",
        }}
      >
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
        <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
          Inquiry sent
        </p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {person.name} will get back to you at{" "}
          {submittedEmail || "your email"}.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex w-full items-center justify-center gap-2 py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-colors active:scale-[0.98]"
          style={{ backgroundColor: "var(--primary)" }}
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
            transition={{ duration: 0.3, ease: cEase }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Your email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClasses}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  End date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClasses}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Group size
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={groupSize}
                onChange={(e) => setGroupSize(e.target.value)}
                placeholder="1"
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Anything you'd like us to know"
                rows={3}
                maxLength={2000}
                className="mt-1 w-full border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="h-11 flex-1 border border-[var(--border)] text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending || !email}
                className="h-11 flex-1 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-colors active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: "var(--primary)" }}
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
