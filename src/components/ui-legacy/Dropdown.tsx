import { ReactNode, useEffect, useId, useMemo, useRef, useState, isValidElement, cloneElement } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

type DropdownItem = {
  id: string;
  label: string | ReactNode;
  description?: string;
  icon?: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
};

type DropdownProps = {
  label: string | ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  className?: string;
  menuClassName?: string;
  triggerClassName?: string;
  hideChevron?: boolean;
};

export function Dropdown({
  label,
  items,
  align = "start",
  className,
  menuClassName,
  triggerClassName,
  hideChevron = false,
}: DropdownProps) {
  const triggerId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
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

  // Calculate menu position to ensure it stays within viewport
  useEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) {
      setMenuStyle({});
      return undefined;
    }

    const calculatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const menuRect = menuRef.current?.getBoundingClientRect();
      const containerRect = triggerRef.current?.parentElement?.getBoundingClientRect();
      
      if (!triggerRect || !menuRect || !containerRect) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8; // Minimum padding from viewport edges

      // Get menu dimensions (use actual rendered size or fallback)
      const menuWidth = menuRect.width || 256; // Default w-64 = 256px
      const menuHeight = menuRect.height || 200; // Estimate

      const newStyle: React.CSSProperties = {
        position: 'fixed', // Always use fixed when portaled
      };

      // Horizontal positioning - use viewport coordinates for fixed positioning
      if (align === "end") {
        // Right-aligned: align menu's right edge with trigger's right edge
        newStyle.right = `${viewportWidth - triggerRect.right}px`;
        newStyle.left = 'auto';
      } else {
        // Left-aligned: align menu's left edge with trigger's left edge
        newStyle.left = `${triggerRect.left}px`;
        newStyle.right = 'auto';
      }

      // Check horizontal overflow and adjust if needed
      const menuLeftViewport = align === "end" 
        ? viewportWidth - triggerRect.right - menuWidth
        : triggerRect.left;
      const menuRightViewport = align === "end"
        ? triggerRect.right
        : triggerRect.left + menuWidth;

      if (menuRightViewport > viewportWidth - padding) {
        // Would overflow right edge - flip to left side
        newStyle.left = `${Math.max(padding, triggerRect.left - menuWidth)}px`;
        newStyle.right = 'auto';
      } else if (menuLeftViewport < padding) {
        // Would overflow left edge - flip to right side
        newStyle.right = `${Math.max(padding, viewportWidth - triggerRect.right)}px`;
        newStyle.left = 'auto';
      }

      // Vertical positioning - ensure menu doesn't overflow bottom
      const gap = 8; // mt-2 = 8px gap
      const spaceBelow = viewportHeight - triggerRect.bottom - gap - padding;
      const spaceAbove = triggerRect.top - gap - padding;
      
      // Use actual menu height if available, otherwise use a safe estimate
      // Add extra buffer to be safe
      const actualMenuHeight = menuRect.height > 0 ? menuRect.height + 4 : Math.max(menuHeight, 160);
      
      // Always check if menu would overflow bottom of viewport
      // Calculate where menu bottom would be if positioned normally below
      const menuBottomIfBelow = triggerRect.bottom + gap + actualMenuHeight;
      const wouldOverflowBottom = menuBottomIfBelow > viewportHeight - padding;
      
      // Check if menu fits below, above, or needs to be constrained
      const fitsBelow = spaceBelow >= actualMenuHeight;
      const fitsAbove = spaceAbove >= actualMenuHeight;
      
      // Use fixed positioning when near bottom to allow overflow outside card
      // Calculate distance from bottom of viewport
      const distanceFromBottom = viewportHeight - triggerRect.bottom;
      const _isNearBottom = distanceFromBottom < 300;
      void _isNearBottom; // Intentionally unused - kept for future use
      
      // Always use fixed positioning when portaled (which we always do now)
      // Position relative to trigger button in viewport coordinates
      if (align === "end") {
        newStyle.right = `${viewportWidth - triggerRect.right}px`;
        newStyle.left = 'auto';
      } else {
        newStyle.left = `${triggerRect.left}px`;
        newStyle.right = 'auto';
      }
      
      // Check if we should position above or below
      if (wouldOverflowBottom || !fitsBelow) {
        // Menu doesn't fit below - try positioning above
        if (fitsAbove && spaceAbove > spaceBelow) {
          // Position above trigger using viewport coordinates
          newStyle.bottom = `${viewportHeight - triggerRect.top + gap}px`;
          newStyle.top = 'auto';
          
          // If still doesn't fit above, constrain height
          if (!fitsAbove && spaceAbove < actualMenuHeight) {
            const constrainedHeight = Math.max(spaceAbove - 8, 120);
            newStyle.maxHeight = `${constrainedHeight}px`;
            newStyle.overflowY = 'auto';
          }
        } else {
          // Constrain below - position below trigger
          newStyle.top = `${triggerRect.bottom + gap}px`;
          newStyle.bottom = 'auto';
          
          // Calculate maximum height that definitely fits
          const maxAllowedHeight = Math.max(spaceBelow - 8, 120);
          newStyle.maxHeight = `${maxAllowedHeight}px`;
          newStyle.overflowY = 'auto';
          
          // Final safety check: ensure menu doesn't overflow viewport bottom
          const menuBottomInViewport = triggerRect.bottom + gap + maxAllowedHeight;
          if (menuBottomInViewport > viewportHeight - padding) {
            // Recalculate with stricter constraint
            const strictMaxHeight = Math.max(viewportHeight - triggerRect.bottom - gap - padding - 8, 120);
            newStyle.maxHeight = `${strictMaxHeight}px`;
          }
        }
      } else {
        // Menu fits below - position normally
        newStyle.top = `${triggerRect.bottom + gap}px`;
        newStyle.bottom = 'auto';
      }

      setMenuStyle(newStyle);
    };

    // Calculate position after menu is rendered
    // Use multiple requestAnimationFrame calls to ensure DOM is fully updated and measured
    let cancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const scheduleCalculation = () => {
      const frameId1 = requestAnimationFrame(() => {
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (cancelled) return;
          // One more frame to ensure layout is complete and measurements are accurate
          requestAnimationFrame(() => {
            if (!cancelled) {
              calculatePosition();
              // Schedule one more check after a short delay to catch any late layout changes
              timeoutId = setTimeout(() => {
                if (!cancelled) {
                  calculatePosition();
                }
              }, 50);
            }
          });
        });
      });
      return frameId1;
    };
    
    const frameId1 = scheduleCalculation();
    
    // Recalculate on scroll or resize
    window.addEventListener("scroll", calculatePosition, true);
    window.addEventListener("resize", calculatePosition);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId1);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener("scroll", calculatePosition, true);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [open, align]);

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
      if (previous) {
        setActiveIndex(previous.index);
        itemsRef.current[previous.index]?.focus({ preventScroll: true });
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      const first = enabledItems[0];
      if (first) {
        setActiveIndex(first.index);
        itemsRef.current[first.index]?.focus({ preventScroll: true });
      }
    } else if (event.key === "End") {
      event.preventDefault();
      const last = enabledItems[enabledItems.length - 1];
      if (last) {
        setActiveIndex(last.index);
        itemsRef.current[last.index]?.focus({ preventScroll: true });
      }
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
        className={cn(
          "inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
          triggerClassName
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
      >
        {isValidElement(label) && typeof label.type !== 'string'
          ? cloneElement(label as React.ReactElement<{ isOpen?: boolean }>, { isOpen: open })
          : <span className="flex items-center">{label}</span>}
        {!hideChevron && (
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
        )}
      </button>

      {open && typeof document !== 'undefined' ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          className={cn(
            // Always use fixed positioning when portaled to avoid overflow clipping
            "fixed z-40 w-64 rounded-2xl bg-white p-2 focus:outline-none",
            // Only apply alignment classes if we're not using custom positioning
            Object.keys(menuStyle).length === 0 ? alignmentClasses : "",
            // Always add overflow handling if maxHeight is set
            menuStyle.maxHeight ? "overflow-y-auto overscroll-contain" : "",
            menuClassName,
          )}
          style={Object.keys(menuStyle).length > 0 ? menuStyle : undefined}
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
        </div>,
        document.body
      ) : null}
    </div>
  );
}

Dropdown.displayName = "Dropdown";


