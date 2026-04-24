"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CopyEmailButtonProps {
  email: string;
}

export function CopyEmailButton({ email }: CopyEmailButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable; the mailto link beside this button is the fallback.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={
        copied
          ? "Email address copied to clipboard"
          : `Copy ${email} to clipboard`
      }
      className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground-secondary transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 active:scale-[0.98]"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-success" aria-hidden="true" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" aria-hidden="true" />
          <span>Copy email</span>
        </>
      )}
    </button>
  );
}
