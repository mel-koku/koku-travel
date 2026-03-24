import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-background px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <h1 className={cn(typography({ intent: "editorial-h1" }), "mb-6")}>Privacy</h1>
        <p className="text-foreground-secondary leading-relaxed">
          We collect only what we need to plan your trip. No tracking, no ads, no selling your data.
        </p>
      </div>
    </main>
  );
}
