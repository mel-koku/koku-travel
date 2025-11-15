import { ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";

type DropdownItem = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
};

type DropdownProps = {
  label: string;
  items: DropdownItem[];
  align?: "start" | "end";
  className?: string;
  menuClassName?: string;
};

export function Dropdown({
  label,
  items,
  align = "start",
  className,
  menuClassName,
}: DropdownProps) {
  const triggerId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current?.contains(event.target as Node) ||
        triggerRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const firstEnabledIndex = items.findIndex((item) => !item.disabled);
    const frame = window.requestAnimationFrame(() => {
      setActiveIndex(firstEnabledIndex);
      if (firstEnabledIndex !== -1) {
        itemsRef.current[firstEnabledIndex]?.focus({ preventScroll: true });
      }
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open, items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (!item || item.disabled) return;

    item.onSelect?.();
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const enabledItems = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.disabled);
    if (enabledItems.length === 0) return;

    const currentEnabledIndex = enabledItems.findIndex(({ index }) => index === activeIndex);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = enabledItems[(currentEnabledIndex + 1) % enabledItems.length];
      if (next) {
        setActiveIndex(next.index);
        itemsRef.current[next.index]?.focus({ preventScroll: true });
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const previous =
        enabledItems[
          (currentEnabledIndex - 1 + enabledItems.length) % enabledItems.length
        ];
      setActiveIndex(previous.index);
      itemsRef.current[previous.index]?.focus({ preventScroll: true });
    } else if (event.key === "Home") {
      event.preventDefault();
      const first = enabledItems[0];
      setActiveIndex(first.index);
      itemsRef.current[first.index]?.focus({ preventScroll: true });
    } else if (event.key === "End") {
      event.preventDefault();
      const last = enabledItems[enabledItems.length - 1];
      setActiveIndex(last.index);
      itemsRef.current[last.index]?.focus({ preventScroll: true });
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectItem(activeIndex);
    }
  };

  const alignmentClasses = useMemo(
    () =>
      ({
        start: "origin-top-left left-0",
        end: "origin-top-right right-0",
      })[align],
    [align],
  );

  return (
    <div className={cn("relative inline-flex flex-col text-left", className)}>
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
      >
        {label}
        <svg
          className={cn("h-4 w-4 transform transition-transform", open && "rotate-180")}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 20 20"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
        </svg>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          className={cn(
            "absolute z-40 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-2 shadow-lg ring-1 ring-black/5 focus:outline-none",
            alignmentClasses,
            menuClassName,
          )}
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
        >
          <div className="py-1">
            {items.map(({ id, label: itemLabel, description, icon, disabled }, index) => (
              <button
                key={id}
                ref={(node) => {
                  itemsRef.current[index] = node;
                }}
                type="button"
                role="menuitem"
                aria-disabled={disabled}
                disabled={disabled}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                  activeIndex === index && "bg-indigo-50 text-indigo-700",
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-gray-50 focus:bg-gray-50 focus:text-indigo-700",
                )}
                onClick={() => selectItem(index)}
              >
                {icon ? <span className="mt-0.5 text-gray-500">{icon}</span> : null}
                <span className="flex flex-col">
                  <span className="font-medium">{itemLabel}</span>
                  {description ? <span className="text-xs text-gray-500">{description}</span> : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

Dropdown.displayName = "Dropdown";


