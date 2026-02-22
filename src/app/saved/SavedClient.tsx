"use client";

import SavedShell from "@/components/features/saved/SavedShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useSaved } from "@/context/SavedContext";
import type { PagesContent } from "@/types/sanitySiteContent";

type SavedClientProps = {
  content?: PagesContent;
};

export function SavedClient({ content }: SavedClientProps) {
  const { saved } = useSaved();
  const count = saved.length;

  const subtitle =
    count > 0
      ? (content?.savedSubtitleWithCount ?? `{count} ${count === 1 ? "place" : "places"} on your list.`).replace("{count}", String(count))
      : content?.savedSubtitleEmpty ?? "Bookmark the places that catch your eye.";

  return (
    <div className="min-h-[100dvh] bg-background">
      <PageHeader
        eyebrow={content?.savedEyebrow ?? "Saved"}
        title={content?.savedTitle ?? "Saved Places"}
        subtitle={subtitle}
        imageUrl={content?.savedBackgroundImage?.url ?? "/images/regions/kyushu-hero.jpg"}
      />

      {/* Collection count strip */}
      {count > 0 && (
        <section className="bg-background py-8 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 sm:gap-8">
              <ScrollReveal>
                <div className="flex items-baseline gap-2">
                  <AnimatedNumber
                    value={count}
                    className="font-mono text-3xl text-brand-secondary sm:text-4xl"
                  />
                  <span className="text-sm text-foreground-secondary">
                    {count === 1 ? "place" : "places"} saved
                  </span>
                </div>
              </ScrollReveal>
              <div className="h-8 w-px bg-border" />
              <ScrollReveal delay={0.1}>
                <p className="text-xs uppercase tracking-[0.3em] text-foreground-secondary">
                  Your Collection
                </p>
              </ScrollReveal>
            </div>
          </div>
        </section>
      )}

      <SavedShell />
    </div>
  );
}
