"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TimePickerCProps = {
  value?: string; // "HH:MM" format
  onChange: (time: string | undefined) => void;
  placeholder?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0"),
);
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  (i * 5).toString().padStart(2, "0"),
);

const VERMILLION = "#e63312";

export function TimePickerC({
  value,
  onChange,
  placeholder = "Set time",
}: TimePickerCProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<React.CSSProperties>({});

  const [hour, minute] = value ? value.split(":") : ["", ""];

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const calculate = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportHeight = window.innerHeight;
      const panelHeight = 280;
      const gap = 4;

      const fitsBelow =
        rect.bottom + gap + panelHeight < viewportHeight - 8;

      setPosition({
        position: "fixed",
        left: `${rect.left}px`,
        ...(fitsBelow
          ? { top: `${rect.bottom + gap}px` }
          : { bottom: `${viewportHeight - rect.top + gap}px` }),
      });
    };

    calculate();
    window.addEventListener("scroll", calculate, true);
    window.addEventListener("resize", calculate);
    return () => {
      window.removeEventListener("scroll", calculate, true);
      window.removeEventListener("resize", calculate);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      if (hour && hoursRef.current) {
        const el = hoursRef.current.querySelector(
          `[data-value="${hour}"]`,
        ) as HTMLElement;
        el?.scrollIntoView({ block: "center" });
      }
      if (minute && minutesRef.current) {
        const el = minutesRef.current.querySelector(
          `[data-value="${minute}"]`,
        ) as HTMLElement;
        el?.scrollIntoView({ block: "center" });
      }
    });
  }, [open, hour, minute]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const selectHour = useCallback(
    (h: string) => {
      const m = minute || "00";
      onChange(`${h}:${m}`);
    },
    [minute, onChange],
  );

  const selectMinute = useCallback(
    (m: string) => {
      const h = hour || "12";
      onChange(`${h}:${m}`);
    },
    [hour, onChange],
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          height: 36,
          width: "7rem",
          borderRadius: 0,
          border: "1px solid var(--border)",
          backgroundColor: "var(--background)",
          paddingLeft: 12,
          paddingRight: 12,
          fontVariantNumeric: "tabular-nums",
          fontSize: 14,
          textAlign: "left",
          color: value ? "var(--foreground)" : "var(--muted-foreground)",
          outline: "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--primary)";
          e.currentTarget.style.boxShadow = "0 0 0 1px var(--primary)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {value || placeholder}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div data-variant="c">
            <div
              ref={panelRef}
              data-lenis-prevent
              style={{
                ...position,
                zIndex: 60,
                display: "flex",
                height: 280,
                borderRadius: 0,
                border: "1px solid var(--border)",
                backgroundColor: "var(--background)",
              }}
            >
              {/* Hours column */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 64,
                  borderRight: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    backgroundColor: "var(--surface)",
                    padding: "8px 8px 6px",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    color: "var(--muted-foreground)",
                  }}
                >
                  Hr
                </span>
                <div
                  ref={hoursRef}
                  className="scrollbar-thin"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    overflowY: "auto",
                    overscrollBehavior: "contain",
                    paddingBottom: 4,
                  }}
                >
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      data-value={h}
                      onClick={() => selectHour(h)}
                      style={{
                        margin: "0 4px",
                        display: "flex",
                        height: 36,
                        minHeight: 36,
                        flexShrink: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 0,
                        border: "none",
                        fontVariantNumeric: "tabular-nums",
                        fontSize: 14,
                        cursor: "pointer",
                        transition: "background-color 0.15s, color 0.15s",
                        backgroundColor:
                          h === hour
                            ? `color-mix(in srgb, ${VERMILLION} 15%, transparent)`
                            : "transparent",
                        color:
                          h === hour
                            ? VERMILLION
                            : "var(--muted-foreground)",
                      }}
                      onMouseEnter={(e) => {
                        if (h !== hour) {
                          e.currentTarget.style.backgroundColor =
                            `color-mix(in srgb, ${VERMILLION} 8%, transparent)`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (h !== hour) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutes column */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 64,
                }}
              >
                <span
                  style={{
                    backgroundColor: "var(--surface)",
                    padding: "8px 8px 6px",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    color: "var(--muted-foreground)",
                  }}
                >
                  Min
                </span>
                <div
                  ref={minutesRef}
                  className="scrollbar-thin"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    overflowY: "auto",
                    overscrollBehavior: "contain",
                    paddingBottom: 4,
                  }}
                >
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      data-value={m}
                      onClick={() => selectMinute(m)}
                      style={{
                        margin: "0 4px",
                        display: "flex",
                        height: 36,
                        minHeight: 36,
                        flexShrink: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 0,
                        border: "none",
                        fontVariantNumeric: "tabular-nums",
                        fontSize: 14,
                        cursor: "pointer",
                        transition: "background-color 0.15s, color 0.15s",
                        backgroundColor:
                          m === minute
                            ? `color-mix(in srgb, ${VERMILLION} 15%, transparent)`
                            : "transparent",
                        color:
                          m === minute
                            ? VERMILLION
                            : "var(--muted-foreground)",
                      }}
                      onMouseEnter={(e) => {
                        if (m !== minute) {
                          e.currentTarget.style.backgroundColor =
                            `color-mix(in srgb, ${VERMILLION} 8%, transparent)`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (m !== minute) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
