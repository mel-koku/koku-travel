"use client";

import { cn } from "@/lib/cn";
import { useAppState } from "@/state/AppState";
import { VIBES } from "@/data/vibes";
import type { VibeId } from "@/data/vibes";
import { LEARNED_VIBES_THRESHOLD } from "@/lib/constants/signInPrompts";
import type { UserPreferences } from "@/types/userPreferences";

type TravelPreferencesSectionProps = {
  disabled?: boolean;
};

const TRIP_BUILDER_VIBES = VIBES.filter((v) => v.id !== "in_season");

const GROUP_OPTIONS: { value: NonNullable<UserPreferences["defaultGroupType"]>; label: string }[] =
  [
    { value: "solo", label: "Solo" },
    { value: "couple", label: "Couple" },
    { value: "family", label: "Family" },
    { value: "friends", label: "Friends" },
  ];

const PACE_OPTIONS: { value: NonNullable<UserPreferences["defaultPace"]>; label: string }[] = [
  { value: "relaxed", label: "Relaxed" },
  { value: "balanced", label: "Balanced" },
  { value: "fast", label: "Active" },
];

const DIETARY_OPTIONS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "gluten-free", label: "Gluten-free" },
  { value: "dairy-free", label: "Dairy-free" },
];

const ACCOMMODATION_OPTIONS = [
  { value: "ryokan", label: "Ryokan" },
  { value: "hotel", label: "Hotel" },
  { value: "hostel", label: "Hostel" },
];

export function TravelPreferencesSection({ disabled = false }: TravelPreferencesSectionProps) {
  const { userPreferences, setUserPreferences, trips } = useAppState();

  const tripCount = trips.length;
  const showLearnedVibes = tripCount >= LEARNED_VIBES_THRESHOLD;

  // Vibes learned from trip history that are not already set as explicit defaults
  const learnedVibeEntries = Object.entries(userPreferences.learnedVibes)
    .filter(([vibeId, count]) => {
      const isKnownVibe = TRIP_BUILDER_VIBES.some((v) => v.id === vibeId);
      const isAlreadyDefault = userPreferences.defaultVibes.includes(vibeId as VibeId);
      return isKnownVibe && !isAlreadyDefault && count >= 1;
    })
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  function toggleChip(
    field: "dietaryRestrictions" | "accommodationStyle" | "defaultVibes",
    value: string
  ) {
    if (disabled) return;
    const current = userPreferences[field] as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setUserPreferences({ [field]: next });
  }

  function setGroupType(value: NonNullable<UserPreferences["defaultGroupType"]>) {
    if (disabled) return;
    setUserPreferences({
      defaultGroupType: userPreferences.defaultGroupType === value ? undefined : value,
    });
  }

  function setPace(value: NonNullable<UserPreferences["defaultPace"]>) {
    if (disabled) return;
    setUserPreferences({
      defaultPace: userPreferences.defaultPace === value ? undefined : value,
    });
  }

  function promoteLearnedVibe(vibeId: VibeId) {
    if (disabled) return;
    const next = [...userPreferences.defaultVibes, vibeId];
    setUserPreferences({ defaultVibes: next });
  }

  const chipBase =
    "inline-flex min-h-11 items-center rounded-md border px-3 py-1.5 text-sm transition-colors active:scale-[0.98]";
  const chipSelected = "border-brand-primary bg-brand-primary/10 text-brand-primary font-medium";
  const chipUnselected =
    "border-border bg-background text-foreground-secondary hover:bg-surface";
  const chipDisabled = "opacity-50 cursor-not-allowed";

  function chipClass(selected: boolean) {
    return cn(chipBase, selected ? chipSelected : chipUnselected, disabled && chipDisabled);
  }

  return (
    <div className={cn("space-y-6", disabled && "pointer-events-none")}>
      {/* Group type */}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-foreground">Who do you travel with?</p>
          <p className="text-xs text-stone">Used in trip builder</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {GROUP_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGroupType(value)}
              className={chipClass(userPreferences.defaultGroupType === value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Pace */}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-foreground">Default pace</p>
          <p className="text-xs text-stone">Used in trip builder</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PACE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPace(value)}
              className={chipClass(userPreferences.defaultPace === value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Dietary restrictions */}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-foreground">Dietary restrictions</p>
          <p className="text-xs text-stone">Used in trip builder</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleChip("dietaryRestrictions", value)}
              className={chipClass(userPreferences.dietaryRestrictions.includes(value))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Accessibility */}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-foreground">Accessibility</p>
          <p className="text-xs text-stone">Used in trip builder</p>
        </div>
        <label
          className={cn(
            "flex items-center gap-2 text-sm text-foreground-secondary cursor-pointer",
            disabled && chipDisabled
          )}
        >
          <input
            type="checkbox"
            disabled={disabled}
            checked={userPreferences.accessibilityNeeds.mobility ?? false}
            onChange={(e) =>
              setUserPreferences({
                accessibilityNeeds: {
                  ...userPreferences.accessibilityNeeds,
                  mobility: e.target.checked || undefined,
                },
              })
            }
            className="h-4 w-4 rounded border-border accent-brand-primary"
          />
          Mobility considerations
        </label>
        <textarea
          disabled={disabled}
          rows={2}
          placeholder="Any other accessibility needs..."
          value={userPreferences.accessibilityNeeds.notes ?? ""}
          onChange={(e) =>
            setUserPreferences({
              accessibilityNeeds: {
                ...userPreferences.accessibilityNeeds,
                notes: e.target.value || undefined,
              },
            })
          }
          className={cn(
            "w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none",
            disabled && chipDisabled
          )}
        />
      </div>

      {/* Accommodation style */}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-foreground">Accommodation style</p>
          <p className="text-xs text-stone">Used in trip builder</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACCOMMODATION_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleChip("accommodationStyle", value)}
              className={chipClass(userPreferences.accommodationStyle.includes(value))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Favorite vibes */}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-foreground">Favorite vibes</p>
          <p className="text-xs text-stone">Used in trip builder</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TRIP_BUILDER_VIBES.map((vibe) => (
            <button
              key={vibe.id}
              type="button"
              onClick={() => toggleChip("defaultVibes", vibe.id)}
              className={chipClass(userPreferences.defaultVibes.includes(vibe.id))}
            >
              {vibe.name}
            </button>
          ))}
        </div>

        {showLearnedVibes && learnedVibeEntries.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-stone">Suggested from your trips</p>
            <div className="flex flex-wrap gap-2">
              {learnedVibeEntries.map(([vibeId]) => {
                const vibe = TRIP_BUILDER_VIBES.find((v) => v.id === vibeId);
                if (!vibe) return null;
                return (
                  <button
                    key={vibeId}
                    type="button"
                    onClick={() => promoteLearnedVibe(vibeId as VibeId)}
                    className={cn(
                      chipBase,
                      "border-dashed border-brand-primary/40 bg-background text-foreground-secondary hover:bg-brand-primary/5 hover:text-brand-primary",
                      disabled && chipDisabled
                    )}
                  >
                    {vibe.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
