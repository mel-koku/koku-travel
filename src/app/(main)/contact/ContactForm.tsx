"use client";

import { useState, useRef } from "react";
import { useContactSubmit } from "@/hooks/useContactSubmit";
import { useAppState } from "@/state/AppState";
import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx"];

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type FieldErrors = Partial<Record<"name" | "email" | "subject" | "message" | "file", string>>;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContactForm() {
  const { user } = useAppState();
  const mutation = useContactSubmit();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrors((prev) => ({ ...prev, file: "File type not allowed. Use JPG, PNG, WebP, PDF, DOC, or DOCX." }));
      setFile(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({ ...prev, file: "File must be under 5 MB." }));
      setFile(null);
      return;
    }

    setErrors((prev) => ({ ...prev, file: undefined }));
    setFile(selected);
  };

  const removeFile = () => {
    setFile(null);
    setErrors((prev) => ({ ...prev, file: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = formSchema.safeParse({ name, email, subject, message });
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    let attachment: {
      filename: string;
      content: string;
      contentType: string;
      size: number;
    } | undefined;

    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const contentType = MIME_MAP[ext] ?? "application/octet-stream";
      const content = await fileToBase64(file);
      attachment = {
        filename: file.name,
        content,
        contentType,
        size: file.size,
      };
    }

    mutation.mutate(
      { name, email, subject, message, attachment },
      { onSuccess: () => setSubmitted(true) }
    );
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 p-8 text-center">
        <svg
          className="mx-auto h-10 w-10 text-success"
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
        <p className="mt-4 text-base font-medium text-foreground">
          Message sent.
        </p>
        <p className="mt-1 text-sm text-foreground-secondary">
          We&apos;ll get back to you within 48 hours.
        </p>
      </div>
    );
  }

  const inputClasses =
    "mt-1 h-12 w-full rounded-lg border border-border bg-background px-4 text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary/30";

  const isPreFilled = !!user;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Name */}
      <div>
        <label className="eyebrow-editorial block">Name *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className={`${inputClasses} ${isPreFilled && name ? "text-foreground-secondary" : ""}`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-error">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="eyebrow-editorial block">Email *</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`${inputClasses} ${isPreFilled && email ? "text-foreground-secondary" : ""}`}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-error">{errors.email}</p>
        )}
      </div>

      {/* Subject */}
      <div>
        <label className="eyebrow-editorial block">Subject *</label>
        <input
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g., Partnership inquiry, Bug report"
          className={inputClasses}
        />
        {errors.subject && (
          <p className="mt-1 text-sm text-error">{errors.subject}</p>
        )}
      </div>

      {/* Message */}
      <div>
        <label className="eyebrow-editorial block">Message *</label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's on your mind"
          rows={5}
          maxLength={5000}
          className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        {errors.message && (
          <p className="mt-1 text-sm text-error">{errors.message}</p>
        )}
      </div>

      {/* File attachment */}
      <div>
        <label className="eyebrow-editorial block">Attachment (optional)</label>
        <p className="mt-0.5 text-xs text-foreground-secondary">
          JPG, PNG, WebP, PDF, DOC, or DOCX. Max 5 MB.
        </p>
        {file ? (
          <div className="mt-2 flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3">
            <svg
              className="h-5 w-5 shrink-0 text-foreground-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
              />
            </svg>
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {file.name}
            </span>
            <span className="shrink-0 text-xs text-foreground-secondary">
              {formatFileSize(file.size)}
            </span>
            <button
              type="button"
              onClick={removeFile}
              className="shrink-0 rounded p-1 text-foreground-secondary hover:text-foreground"
              aria-label="Remove attachment"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground-secondary transition-colors hover:border-foreground-secondary hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
              />
            </svg>
            Choose file
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
        {errors.file && (
          <p className="mt-1 text-sm text-error">{errors.file}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="btn-yuku h-12 w-full rounded-lg bg-brand-primary text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
      >
        {mutation.isPending ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
