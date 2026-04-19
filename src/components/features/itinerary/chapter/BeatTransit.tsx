"use client";

export type BeatTransitProps = {
  minutes: number;
  mode: "walk" | "train" | "car" | "bus" | "transit";
  line?: string; // e.g. "JR Nara line"
  onClick?: () => void;
};

const labelForMode: Record<BeatTransitProps["mode"], string> = {
  walk: "walk",
  train: "train",
  car: "drive",
  bus: "bus",
  transit: "transit",
};

export function BeatTransit({ minutes, mode, line, onClick }: BeatTransitProps) {
  const text = line
    ? `↓ ${minutes} min · ${line}`
    : `↓ ${minutes} min ${labelForMode[mode]}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="block text-[10px] text-foreground-secondary tracking-wide uppercase -mt-4 mb-4 ml-[-24px]"
    >
      {text}
    </button>
  );
}
