"use client";

import { useRef } from "react";
import { ArrowUp } from "lucide-react";

type AskKokuInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
};

export function AskKokuInputB({
  value,
  onChange,
  onSubmit,
  isLoading,
}: AskKokuInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="border-t border-[var(--border)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about Japan..."
          disabled={isLoading}
          className="h-12 flex-1 rounded-xl border border-[var(--border)] bg-white px-4 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50"
        />
        <button
          onClick={onSubmit}
          disabled={isLoading || !value.trim()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-elevated)] active:scale-[0.98] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <ArrowUp className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
