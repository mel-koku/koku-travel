"use client";

type PillarTagProps = {
  slug: string;
  onNavigate?: (pillarSlug: string) => void;
};

const PILLAR_NAMES: Record<string, string> = {
  wa: "Wa",
  meiwaku: "Meiwaku",
  kegare: "Kegare",
  omotenashi: "Omotenashi",
  ma: "Ma",
};

export function PillarTag({ slug, onNavigate }: PillarTagProps) {
  const name = PILLAR_NAMES[slug];
  if (!name) return null;

  if (onNavigate) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(slug)}
        className="ml-1 inline font-mono text-[10px] text-foreground-secondary transition-colors hover:text-brand-primary"
      >
        &middot; {name}
      </button>
    );
  }

  return (
    <span className="ml-1 font-mono text-[10px] text-foreground-secondary">
      &middot; {name}
    </span>
  );
}
