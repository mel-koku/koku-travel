import { typography } from "@/lib/typography-system";

type Pillar = {
  name: string;
  japanese: string;
  concept: string;
  inPractice: string;
};

const PILLARS: Pillar[] = [
  {
    name: "Wa",
    japanese: "\u548C",
    concept: "Harmony is the highest social value.",
    inPractice:
      "Read the room before acting. Queue where others queue. Match the volume around you. When unsure, observe first. The group's comfort matters more than individual expression.",
  },
  {
    name: "Meiwaku",
    japanese: "\u8FF7\u60D1",
    concept: "Never cause inconvenience to others.",
    inPractice:
      "Keep phone calls off trains. Carry your trash until you find a bin. Eat only in designated areas (shinkansen and food courts, not commuter trains). Step aside on escalators. Be punctual.",
  },
  {
    name: "Kegare",
    japanese: "\u7A62\u308C",
    concept: "Purity and purification shape daily rituals.",
    inPractice:
      "Shoes off at the genkan (the step up). Wash your hands at the temizuya before entering a shrine. Shower before the onsen, never after. These aren't rules posted for tourists. They're how the space stays clean for everyone.",
  },
  {
    name: "Omotenashi",
    japanese: "\u304A\u3082\u3066\u306A\u3057",
    concept: "Hospitality given without expectation of return.",
    inPractice:
      "Accept what's offered gracefully. Don't tip (it can cause confusion). When someone goes out of their way for you, a sincere arigatou gozaimasu is the right response. Receive with both hands.",
  },
  {
    name: "Ma",
    japanese: "\u9593",
    concept: "The space between things carries meaning.",
    inPractice:
      "Silence in conversation is not awkward. Empty space in a garden is intentional. The pause before a bow matters. Don't rush to fill quiet moments. Let the temples breathe.",
  },
];

export function PrintCulturalPillars() {
  return (
    <article className="print-page">
      <div className="print-page-inner">
        <header className="mb-8">
          <p className="eyebrow-mono mb-3">Culture</p>
          <h2 className={typography({ intent: "editorial-h1" })}>
            Five things to carry
          </h2>
          <p className="font-serif text-[10.5pt] leading-[1.55] text-foreground-body mt-4">
            Japanese social customs aren&apos;t arbitrary rules. They grow from five
            philosophical foundations. Understanding the why makes the what feel
            natural.
          </p>
        </header>

        <div className="flex-1 space-y-5">
          {PILLARS.map((pillar) => (
            <div key={pillar.name} className="print-avoid-break">
              <div className="flex items-baseline gap-2 mb-1">
                <h3 className="font-serif text-[12pt] font-semibold leading-tight text-foreground">
                  {pillar.name}
                </h3>
                <span className="font-sans text-[10pt] text-foreground-secondary">
                  {pillar.japanese}
                </span>
                <span className="font-sans text-[8pt] text-stone italic">
                  {pillar.concept}
                </span>
              </div>
              <p className="font-sans text-[9pt] leading-[1.6] text-foreground-body">
                {pillar.inPractice}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="print-folio">Culture</div>
    </article>
  );
}
