import type { Difficulty } from "@/types/experience";

type ExperienceQuickFactsProps = {
  duration?: string;
  groupSizeMin?: number;
  groupSizeMax?: number;
  difficulty?: Difficulty;
  estimatedCost?: string;
  bestSeason?: string[];
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  challenging: "Challenging",
};

export function ExperienceQuickFacts({
  duration,
  groupSizeMin,
  groupSizeMax,
  difficulty,
  estimatedCost,
  bestSeason,
}: ExperienceQuickFactsProps) {
  const facts: { label: string; value: string }[] = [];

  if (duration) facts.push({ label: "Duration", value: duration });

  if (groupSizeMin || groupSizeMax) {
    const size =
      groupSizeMin && groupSizeMax
        ? groupSizeMin === groupSizeMax
          ? `${groupSizeMin}`
          : `${groupSizeMin}–${groupSizeMax}`
        : `${groupSizeMin || groupSizeMax}`;
    facts.push({ label: "Group Size", value: `${size} people` });
  }

  if (difficulty) facts.push({ label: "Difficulty", value: DIFFICULTY_LABELS[difficulty] });
  if (estimatedCost) facts.push({ label: "Cost", value: estimatedCost });

  if (bestSeason?.length) {
    const seasonLabel = bestSeason.includes("year-round")
      ? "Year-round"
      : bestSeason.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ");
    facts.push({ label: "Best Season", value: seasonLabel });
  }

  if (facts.length === 0) return null;

  return (
    <section className="border-y border-border/50 py-8">
      <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-x-10 gap-y-4 px-6">
        {facts.map((fact) => (
          <div key={fact.label} className="text-center">
            <p className="eyebrow-editorial">
              {fact.label}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {fact.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
