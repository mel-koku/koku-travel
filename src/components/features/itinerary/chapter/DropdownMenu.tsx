"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";

export type DropdownMenuItem = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  tone?: "default" | "destructive";
};

export type DropdownMenuProps = {
  trigger: ReactNode;
  items: DropdownMenuItem[];
  align?: "left" | "right";
  ariaLabel?: string;
};

export function DropdownMenu({
  trigger,
  items,
  align = "right",
  ariaLabel,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex items-center" aria-label={ariaLabel}>
      <div
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
        role="presentation"
      >
        {trigger}
      </div>
      {open && (
        <ul
          role="menu"
          className={`absolute z-50 mt-1 min-w-[160px] rounded-md border border-border bg-surface shadow-[var(--shadow-elevated)] py-1 ${align === "right" ? "right-0" : "left-0"}`}
        >
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40 ${item.tone === "destructive" ? "text-error" : "text-foreground"}`}
              >
                {item.icon && <span aria-hidden>{item.icon}</span>}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
