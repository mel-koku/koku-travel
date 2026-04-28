"use client";

import { useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography-system";
import { resizePhotoUrl } from "@/lib/google/transformations";
import type { Location } from "@/types/location";
import { DropdownMenu } from "./DropdownMenu";

export type BeatChip = {
  id: string;
  label: string;
  tone: "neutral" | "warn";
  /**
   * When true and the parent indicates day-of mode, this chip renders as an
   * inline bold line below the body instead of in the chip row. Task 31 wires
   * the behavior; Beat itself treats this as a render hint only.
   */
  promoteInline?: boolean;
};

export type BeatProps = {
  time: string; // "08:00"
  location: Location;
  body: string;
  note?: string;
  isPast: boolean;
  isCurrent?: boolean;
  chips: BeatChip[];
  hasMore?: boolean;
  /**
   * True when the beat was built from a custom (user-added) activity. Drives
   * UX gates that only apply to user-authored stops — currently the note
   * panel defaults open since the user explicitly added the stop and is
   * likely to want to annotate it.
   */
  isCustom?: boolean;
  onExpand: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onReplace?: () => void;
  onNoteChange?: (value: string) => void;
  onRemove?: () => void;
  /**
   * 1-based position of this beat among the day's stops. When set, renders
   * inside the spine dot to match the numbered map pin. Anchors and meal
   * slots stay tier-2 (small unnumbered dots) so the visual hierarchy reads
   * "this is stop N" at a glance.
   */
  sequenceNumber?: number;
};

const formatDuration = (raw: number | string | null | undefined): string => {
  const minutes = typeof raw === "string" ? parseInt(raw, 10) : raw;
  if (!minutes || minutes <= 0 || isNaN(minutes)) return "";
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `~${h}h ${m}m` : `~${h}h`;
  }
  return `~${minutes}m`;
};

export function Beat({
  time,
  location,
  body,
  note,
  isPast,
  isCurrent = false,
  chips,
  hasMore = false,
  isCustom = false,
  onExpand,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  onReplace,
  onNoteChange,
  onRemove,
  sequenceNumber,
}: BeatProps) {
  const duration = formatDuration(
    (location as unknown as { estimatedDuration?: number | string }).estimatedDuration,
  );

  const imageSrc = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 800);
  const hasNote = Boolean(note && note.trim().length > 0);
  // Default the note panel + textarea to open for custom (user-added) stops:
  // the user explicitly added the place and is likely to want to annotate
  // it, so don't make them click to reveal the field. Catalog stops keep
  // the prior behavior — panel hidden until a note exists, textarea
  // collapsed to the one-line summary once saved.
  const [noteDraftOpen, setNoteDraftOpen] = useState(isCustom || hasNote);
  const [noteExpanded, setNoteExpanded] = useState(isCustom || !hasNote);
  const [draft, setDraft] = useState(note ?? "");
  const hasAnyMenuAction = Boolean(onReplace || onNoteChange || onRemove);

  // Compute splits: only when isCurrent do we promote.
  const inlineChips = isCurrent ? chips.filter((c) => c.promoteInline) : [];
  const regularChips = isCurrent ? chips.filter((c) => !c.promoteInline) : chips;

  return (
    <li
      data-beat="place"
      data-beat-state={isPast ? "past" : isCurrent ? "current" : "future"}
      className={cn(
        "relative pb-4 group",
        isCurrent && "border-l-2 border-brand-primary bg-brand-primary/5 pl-3 -ml-[30px]",
      )}
    >
      {sequenceNumber !== undefined ? (
        <span
          aria-hidden
          className={cn(
            // Bumped to 22×22 to fit a digit; left offset shifts -3px so the
            // dot center stays vertically aligned with anchor/meal-slot dots
            // (those stay 13×13 at left-[-24px]). Border weight matches the
            // spine line weight so the dot reads as part of the same hairline.
            "absolute left-[-29px] top-[7px] h-[22px] w-[22px] rounded-full border border-border",
            "flex items-center justify-center font-mono text-[11px] font-semibold leading-none",
            isPast
              ? "bg-foreground text-background"
              : "bg-background text-foreground",
          )}
        >
          {sequenceNumber}
        </span>
      ) : (
        <span
          aria-hidden
          className={cn(
            "absolute left-[-24px] top-[11px] h-[13px] w-[13px] rounded-full border-2 border-foreground",
            isPast ? "bg-foreground" : "bg-background",
          )}
        />
      )}
      {/* Catalog beats: card is clickable and opens the detail panel.
          Custom beats: detail lookup no-ops upstream, so the card stays
          non-interactive at the markup level — no role/tabindex/aria-label,
          no hover or focus affordance. */}
      <div
        {...(isCustom
          ? {}
          : {
              role: "button" as const,
              tabIndex: 0,
              onClick: onExpand,
              onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onExpand();
                }
              },
              "aria-label": `Open details for ${location.name}`,
            })}
        className={cn(
          "block w-full text-left -mx-2 px-2 py-1 rounded-md",
          !isCustom &&
            "hover:bg-canvas/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
        )}
      >
        <div className="flex gap-5 items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="eyebrow-editorial">
                {time}
              </div>
              {hasAnyMenuAction && (
                <div
                  className="opacity-0 group-hover:opacity-100 touch-visible transition-opacity"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <DropdownMenu
                    ariaLabel="Beat actions"
                    align="left"
                    trigger={
                      <button
                        type="button"
                        aria-label="More actions"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-secondary hover:bg-canvas hover:text-foreground transition-colors"
                      >
                        <span className="text-lg leading-none tracking-tighter" aria-hidden>⋯</span>
                      </button>
                    }
                    items={[
                      ...(onReplace
                        ? [{ label: "Replace", onClick: onReplace }]
                        : []),
                      ...(onNoteChange
                        ? [{
                            label: hasNote ? "Edit note" : "Add note",
                            onClick: () => {
                              setDraft(note ?? "");
                              setNoteDraftOpen(true);
                              setNoteExpanded(true);
                            },
                          }]
                        : []),
                      ...(onRemove
                        ? [{ label: "Remove", onClick: onRemove, tone: "destructive" as const }]
                        : []),
                    ]}
                  />
                </div>
              )}
            </div>
            <h3 className={cn(typography({ intent: "editorial-h3" }), "mb-1 text-lg md:text-xl")}>
              {location.name}
            </h3>
            <div className="text-xs text-foreground-secondary mb-3 capitalize">
              {location.category}
              {duration ? ` · ${duration}` : ""}
            </div>
            {body && (
              <p className="text-sm text-foreground-body leading-relaxed max-w-[52ch]">
                {body}
              </p>
            )}
            {noteDraftOpen && onNoteChange && (
              <div
                className="mt-3 rounded-md border border-border bg-canvas/60 p-3"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <div className={`flex items-center justify-between ${noteExpanded ? "mb-2" : ""}`}>
                  <div className="eyebrow-editorial">Note</div>
                  <div className="flex items-center gap-1">
                    {hasNote && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onNoteChange("");
                          setDraft("");
                          setNoteDraftOpen(false);
                          setNoteExpanded(false);
                        }}
                        aria-label="Delete note"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-secondary hover:bg-background hover:text-error transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                          <path d="M2 3h8M4.5 3V2a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M3 3l.5 7a1 1 0 0 0 1 .95h3a1 1 0 0 0 1-.95L9 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setNoteExpanded((v) => !v);
                      }}
                      aria-label={noteExpanded ? "Collapse note" : "Expand note"}
                      aria-expanded={noteExpanded}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-secondary hover:bg-background hover:text-foreground transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                        <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        {!noteExpanded && (
                          <path d="M6 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
                {noteExpanded && (
                  <>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="Add a personal reminder for this stop."
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDraft(note ?? "");
                      setNoteDraftOpen(hasNote);
                    }}
                    className="text-xs text-foreground-secondary hover:text-foreground transition-colors px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onNoteChange(draft.trim());
                      if (draft.trim().length === 0) setNoteDraftOpen(false);
                    }}
                    className="text-xs font-medium text-brand-primary hover:text-brand-secondary transition-colors px-2 py-1"
                  >
                    Save
                  </button>
                </div>
                  </>
                )}
              </div>
            )}
          </div>
          {imageSrc && (
            <div className="relative shrink-0 w-40 sm:w-48 md:w-56 aspect-[4/3] overflow-hidden rounded-lg bg-canvas">
              <Image
                src={imageSrc}
                alt={location.name}
                fill
                sizes="(max-width: 768px) 160px, 224px"
                className="object-cover"
              />
              {(onMoveUp || onMoveDown) && (
                <div
                  className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 touch-visible transition-opacity"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                  {onMoveUp && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveUp(); }}
                      disabled={!canMoveUp}
                      aria-label="Move up"
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-charcoal/70 text-white backdrop-blur-sm hover:bg-charcoal disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                  {onMoveDown && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveDown(); }}
                      disabled={!canMoveDown}
                      aria-label="Move down"
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-charcoal/70 text-white backdrop-blur-sm hover:bg-charcoal disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Inline stakes line — only when isCurrent and at least one promoteInline chip */}
        {inlineChips.length > 0 && (
          <p className="text-sm font-medium text-warning mt-2">
            {inlineChips.map((c) => c.label).join(" · ")}
          </p>
        )}

        {/* Chip row — uses regularChips so promoted chips don't double-render */}
        {regularChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {regularChips.map((chip) => (
              <span
                key={chip.id}
                className={cn(
                  "text-[11px] px-2.5 py-0.5 rounded-full border",
                  chip.tone === "warn"
                    ? "text-warning border-warning/40"
                    : "text-foreground-secondary border-border",
                )}
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}
        {/* "More" hint — visual only, the whole button opens the panel */}
        {hasMore && (
          <span className="mt-3 text-xs text-accent underline underline-offset-2 inline-block">
            More ↓
          </span>
        )}

      </div>
    </li>
  );
}
