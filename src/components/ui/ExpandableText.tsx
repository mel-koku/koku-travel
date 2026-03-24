"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type ExpandableTextProps = {
  text: string;
  className?: string;
  /** Number of lines to show when collapsed (default: 2) */
  clampLines?: 2 | 3;
  /** Character threshold to show "more" toggle (default: 100) */
  threshold?: number;
};

const CLAMP_CLASS = {
  2: "line-clamp-2",
  3: "line-clamp-3",
} as const;

export function ExpandableText({
  text,
  className,
  clampLines = 2,
  threshold = 100,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const needsExpand = text.length > threshold;

  return (
    <div>
      <p className={cn(className, !expanded && needsExpand && CLAMP_CLASS[clampLines])}>
        {text}
        {expanded && needsExpand && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline text-brand-primary hover:underline"
            >
              less
            </button>
          </>
        )}
      </p>
      {!expanded && needsExpand && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-0.5 text-xs text-brand-primary hover:underline"
        >
          more
        </button>
      )}
    </div>
  );
}
