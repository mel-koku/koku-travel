"use client";

import { useState } from "react";

type ExpandableTextBProps = {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  /** Number of lines to show when collapsed (default: 2) */
  clampLines?: 2 | 3;
  /** Character threshold to show "more" toggle (default: 100) */
  threshold?: number;
};

const CLAMP_CLASS = {
  2: "line-clamp-2",
  3: "line-clamp-3",
} as const;

export function ExpandableTextB({
  text,
  className,
  style,
  clampLines = 2,
  threshold = 100,
}: ExpandableTextBProps) {
  const [expanded, setExpanded] = useState(false);
  const needsExpand = text.length > threshold;

  return (
    <div>
      <p
        className={`${className ?? ""} ${!expanded && needsExpand ? CLAMP_CLASS[clampLines] : ""}`.trim()}
        style={style}
      >
        {text}
        {expanded && needsExpand && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline hover:underline"
              style={{ color: "var(--primary)" }}
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
          className="mt-0.5 text-xs hover:underline"
          style={{ color: "var(--primary)" }}
        >
          more
        </button>
      )}
    </div>
  );
}
