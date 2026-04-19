import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography-system";

export type ChapterHeaderProps = {
  dayIndex: number; // 0-based
  city: string;
  date: string; // pre-formatted display string
  intro: string;
};

export function ChapterHeader({ dayIndex, city, date, intro }: ChapterHeaderProps) {
  return (
    <header className="max-w-[720px]">
      <div className="eyebrow-editorial mb-1">DAY {dayIndex + 1}</div>
      <h2 className={cn(typography({ intent: "editorial-h1" }), "mb-1")}>
        {city}
      </h2>
      <div className="text-sm text-foreground-body mb-6">{date}</div>
      {intro && (
        <p
          className={cn(
            typography({ intent: "editorial-prose" }),
            "chapter-prose max-w-[58ch]",
          )}
        >
          {intro}
        </p>
      )}
    </header>
  );
}
