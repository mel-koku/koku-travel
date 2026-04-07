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

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(slug);
      return;
    }
    const target = document.getElementById(slug);
    if (!target) {
      // eslint-disable-next-line no-console
      console.warn(`PillarTag: target element #${slug} not found`);
      return;
    }
    target.scrollIntoView({ behavior: "smooth" });
  };

  if (onNavigate) {
    return (
      <button
        type="button"
        onClick={handleClick}
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
