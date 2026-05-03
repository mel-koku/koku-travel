"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const REPORT_TYPE_OPTIONS = [
  { value: "permanently_closed", label: "Permanently closed" },
  { value: "wrong_hours", label: "Wrong hours" },
  { value: "wrong_address", label: "Wrong address or map pin" },
  { value: "photo_issue", label: "Photo issue" },
  { value: "inaccurate_info", label: "Inaccurate info" },
  { value: "other", label: "Something else" },
] as const;

type ReportType = (typeof REPORT_TYPE_OPTIONS)[number]["value"];

const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 1000;
const DESCRIPTION_COUNTER_THRESHOLD = 800;

type SubmitState = "idle" | "submitting" | "success" | "error";

type LocationReportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  locationName: string;
};

const inputBase =
  "w-full rounded-md border border-border bg-background px-3 text-base text-foreground shadow-[var(--shadow-sm)] placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50";

export function LocationReportDialog({
  isOpen,
  onClose,
  locationId,
  locationName,
}: LocationReportDialogProps) {
  const [reportType, setReportType] = useState<ReportType | "">("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset on close so a fresh open shows a fresh form.
  useEffect(() => {
    if (isOpen) return;
    const t = window.setTimeout(() => {
      setReportType("");
      setDescription("");
      setEmail("");
      setSubmitState("idle");
      setErrorMessage(null);
    }, 200);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  // Auto-close after success.
  useEffect(() => {
    if (submitState !== "success") return;
    const t = window.setTimeout(onClose, 2000);
    return () => window.clearTimeout(t);
  }, [submitState, onClose]);

  const trimmedDescription = description.trim();
  const trimmedEmail = email.trim();
  const canSubmit =
    reportType !== "" &&
    trimmedDescription.length >= DESCRIPTION_MIN &&
    trimmedDescription.length <= DESCRIPTION_MAX &&
    submitState !== "submitting";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitState("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/locations/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          report_type: reportType,
          description: trimmedDescription,
          // Send undefined-as-omitted; route also tolerates "" defensively.
          reporter_email: trimmedEmail || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          setErrorMessage("Too many reports from this device. Please try again later.");
        } else {
          setErrorMessage("Something went wrong. Please try again.");
        }
        setSubmitState("error");
        return;
      }

      setSubmitState("success");
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
      setSubmitState("error");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Spot something wrong?"
      description={
        submitState === "success"
          ? undefined
          : `Tell us what's off about ${locationName} and we'll take a look.`
      }
    >
      {submitState === "success" ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="text-base text-foreground">
            Thanks. We&apos;ll take a look. Your report helps Yuku stay accurate.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <FormField id="report-type" label="What's wrong?" required>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType | "")}
              disabled={submitState === "submitting"}
              required
              className={cn(inputBase, "h-12 appearance-none bg-no-repeat bg-right pr-9")}
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B6058' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
                backgroundPosition: "right 0.75rem center",
                backgroundSize: "16px 16px",
              }}
            >
              <option value="" disabled>
                Choose a category
              </option>
              {REPORT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="report-description"
            label="Details"
            required
            help={
              trimmedDescription.length >= DESCRIPTION_COUNTER_THRESHOLD
                ? `${trimmedDescription.length} / ${DESCRIPTION_MAX}`
                : "A short note is fine. The more specific, the faster we can verify."
            }
          >
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitState === "submitting"}
              required
              rows={4}
              minLength={DESCRIPTION_MIN}
              maxLength={DESCRIPTION_MAX}
              placeholder="Closed when we visited last week, sign on the door said relocated."
              className={cn(inputBase, "py-3 leading-relaxed resize-y")}
            />
          </FormField>

          <FormField
            id="report-email"
            label="Your email"
            help="Optional. If you'd like a follow-up. We won't share it."
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitState === "submitting"}
              autoComplete="email"
              placeholder="you@example.com"
              className={cn(inputBase, "h-12")}
            />
          </FormField>

          {submitState === "error" && errorMessage && (
            <p className="text-sm text-error" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="mt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitState === "submitting"}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!canSubmit}
              isLoading={submitState === "submitting"}
            >
              Send report
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
