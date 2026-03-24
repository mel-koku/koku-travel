"use client";

import { useState } from "react";

type ExpandableTextProps = {
  text: string;
  className?: string;
  /** Character threshold to show "more" toggle (default: 100) */
  threshold?: number;
};

export function ExpandableText({
  text,
  className,
  threshold = 100,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const needsExpand = text.length > threshold;

  if (!needsExpand) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p className={className}>
      {expanded ? text : `${text.slice(0, threshold).trimEnd()}\u2026`}{" "}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="inline whitespace-nowrap text-brand-primary hover:underline"
      >
        {expanded ? "less" : "more"}
      </button>
    </p>
  );
}
