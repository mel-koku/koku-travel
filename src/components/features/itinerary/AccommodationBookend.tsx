import type { EntryPoint } from "@/types/trip";

type AccommodationBookendProps = {
  location: EntryPoint;
  variant: "start" | "end";
  /** Travel estimate in minutes to/from nearest activity */
  travelMinutes?: number;
  /** Walking distance in meters */
  distanceMeters?: number;
};

export function AccommodationBookend({
  location,
  variant,
  travelMinutes,
  distanceMeters,
}: AccommodationBookendProps) {
  const label =
    variant === "start"
      ? `Start from ${location.name}`
      : `Return to ${location.name}`;

  const travelLabel = formatTravelLabel(travelMinutes, distanceMeters);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-sage/20 bg-sage/5 px-3.5 py-2.5">
      {/* Hotel icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sage/15">
        <HotelIcon className="h-4 w-4 text-sage" />
      </div>

      {/* Label + travel estimate */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        {travelLabel && (
          <p className="text-xs text-stone">{travelLabel}</p>
        )}
      </div>
    </div>
  );
}

function formatTravelLabel(
  minutes?: number,
  meters?: number,
): string | null {
  if (!minutes || minutes < 1) return null;

  const time =
    minutes >= 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}min`
      : `${minutes} min`;

  const mode =
    meters != null && meters <= 2000
      ? "walk"
      : meters != null && meters <= 5000
        ? "transit"
        : meters != null
          ? "transit"
          : "walk";

  return `~${time} ${mode}`;
}

function HotelIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v.01M12 14v.01M16 14v.01M8 18v.01M12 18v.01M16 18v.01"
      />
    </svg>
  );
}
