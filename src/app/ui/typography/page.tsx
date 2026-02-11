const typeScale = [
  {
    token: "display",
    size: "8rem / 128px",
    lineHeight: "1",
    usage: "Hero headlines",
    className: "text-[8rem] leading-[1]",
  },
  {
    token: "4xl",
    size: "5.657rem / 90px",
    lineHeight: "1.05",
    usage: "H1",
    className: "text-[5.657rem] leading-[1.05]",
  },
  {
    token: "3xl",
    size: "4rem / 64px",
    lineHeight: "1.1",
    usage: "H2",
    className: "text-[4rem] leading-[1.1]",
  },
  {
    token: "2xl",
    size: "2.828rem / 45px",
    lineHeight: "1.2",
    usage: "H3",
    className: "text-[2.828rem] leading-[1.2]",
  },
  {
    token: "xl",
    size: "2rem / 32px",
    lineHeight: "1.3",
    usage: "H4, subheadings",
    className: "text-[2rem] leading-[1.3]",
  },
  {
    token: "lg",
    size: "1.414rem / 23px",
    lineHeight: "1.5",
    usage: "Lead paragraphs",
    className: "text-[1.414rem] leading-[1.5]",
  },
  {
    token: "base",
    size: "1rem / 16px",
    lineHeight: "1.6",
    usage: "Body text",
    className: "text-[1rem] leading-[1.6]",
  },
  {
    token: "small",
    size: "0.707rem / 11px",
    lineHeight: "1.4",
    usage: "Labels, metadata",
    className: "text-[0.707rem] leading-[1.4]",
  },
  {
    token: "caption",
    size: "0.5rem / 8px",
    lineHeight: "1.4",
    usage: "Legal, fine print",
    className: "text-[0.5rem] leading-[1.4]",
  },
];

const trackingTokens = [
  {
    token: "display",
    value: "-0.04em",
    className: "tracking-[-0.04em]",
    description: "Display headlines — tighter for large serif type",
  },
  {
    token: "heading",
    value: "-0.02em",
    className: "tracking-[-0.02em]",
    description: "Section headings — subtle tightening for hierarchy",
  },
  {
    token: "wide",
    value: "0.15em",
    className: "tracking-[0.15em]",
    description: "Labels and section markers — readable at small sizes",
  },
  {
    token: "ultra",
    value: "0.3em",
    className: "tracking-[0.3em]",
    description: "Uppercase brand labels — maximum letter spacing",
  },
];

const usagePatterns = [
  {
    name: "Page headers",
    font: "Instrument Serif",
    fontClass: "font-serif italic",
    size: "text-4xl",
    tracking: "—",
    sample: "Discover Hidden Kyoto",
  },
  {
    name: "Section labels",
    font: "DM Sans",
    fontClass: "font-sans",
    size: "text-xs",
    tracking: "tracking-ultra, uppercase",
    sample: "FEATURED GUIDES",
    extraClass: "uppercase tracking-[0.3em] text-brand-primary font-semibold",
  },
  {
    name: "Section headings",
    font: "Instrument Serif",
    fontClass: "font-serif italic",
    size: "text-2xl",
    tracking: "—",
    sample: "Where to Begin",
  },
  {
    name: "Body text",
    font: "DM Sans",
    fontClass: "font-sans",
    size: "text-base",
    tracking: "—",
    sample:
      "Wander through centuries-old bamboo groves and discover hidden tea houses tucked along quiet stone paths.",
  },
  {
    name: "Code / data",
    font: "Geist Mono",
    fontClass: "font-mono",
    size: "text-xs",
    tracking: "—",
    sample: "NRT → KIX · 1h 15m · ¥14,720",
  },
];

export default function TypographyPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-12 sm:px-10 sm:py-16">
      <header className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Design System
        </span>
        <h1 className="font-serif text-4xl italic leading-tight text-foreground">
          Typography
        </h1>
        <p className="max-w-2xl text-lg text-foreground-secondary">
          Three typefaces forming a clear hierarchy — editorial serif for
          display, humanist sans for body, and monospace for data. Built on an
          augmented-fourth scale (ratio 1.414).
        </p>
      </header>

      {/* Font Families */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif text-2xl italic text-foreground">
            Font Families
          </h2>
          <p className="text-sm text-foreground-secondary">
            Each font serves a distinct role in the visual hierarchy.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone">
                Display / Headlines
              </p>
              <p className="font-mono text-xs text-foreground-secondary">
                Instrument Serif — italic only, 400
              </p>
            </div>
            <p className="font-serif text-3xl italic leading-tight text-foreground">
              The quick brown fox jumps over the lazy dog
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone">
                Body / UI
              </p>
              <p className="font-mono text-xs text-foreground-secondary">
                DM Sans — 300–700
              </p>
            </div>
            <p className="text-base leading-relaxed text-foreground">
              The quick brown fox jumps over the lazy dog. Pack my box with five
              dozen liquor jugs. How vexingly quick daft zebras jump.
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone">
                Data / Code
              </p>
              <p className="font-mono text-xs text-foreground-secondary">
                Geist Mono — 400
              </p>
            </div>
            <p className="font-mono text-sm leading-relaxed text-foreground">
              NRT → KIX &middot; 1h 15m
              <br />
              ¥14,720 &middot; reserved
              <br />
              35.6762° N, 139.6503° E
            </p>
          </div>
        </div>
      </section>

      {/* Type Scale */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif text-2xl italic text-foreground">
            Type Scale
          </h2>
          <p className="text-sm text-foreground-secondary">
            Augmented-fourth ratio (1.414) from 0.5rem to 8rem. Each step shown
            at actual rendered size.
          </p>
        </div>

        <div className="space-y-6">
          {typeScale.map(({ token, size, lineHeight, usage, className }) => (
            <div
              key={token}
              className="flex flex-col gap-1.5 border-b border-border pb-6 last:border-b-0"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-mono text-xs text-brand-primary">
                  {token}
                </span>
                <span className="font-mono text-xs text-stone">{size}</span>
                <span className="font-mono text-xs text-stone">
                  lh {lineHeight}
                </span>
                <span className="text-xs text-foreground-secondary">
                  {usage}
                </span>
              </div>
              <p
                className={`font-serif italic text-foreground ${className} truncate`}
              >
                Koku
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Letter Spacing */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif text-2xl italic text-foreground">
            Letter Spacing
          </h2>
          <p className="text-sm text-foreground-secondary">
            Four tracking tokens controlling density from tight display to wide
            labels.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {trackingTokens.map(
            ({ token, value, className, description }) => (
              <div
                key={token}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-brand-primary">
                    {token}
                  </span>
                  <span className="font-mono text-xs text-stone">{value}</span>
                </div>
                <p
                  className={`text-xl text-foreground ${className}`}
                >
                  Design System
                </p>
                <p className="text-xs text-foreground-secondary">
                  {description}
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Usage Patterns */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif text-2xl italic text-foreground">
            Usage Patterns
          </h2>
          <p className="text-sm text-foreground-secondary">
            Common font, size, and tracking combinations used across the
            application.
          </p>
        </div>

        <div className="space-y-4">
          {usagePatterns.map(
            ({ name, font, fontClass, size, tracking, sample, extraClass }) => (
              <div
                key={name}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-sm font-medium text-foreground">
                    {name}
                  </span>
                  <span className="font-mono text-xs text-stone">{font}</span>
                  <span className="font-mono text-xs text-stone">{size}</span>
                  <span className="font-mono text-xs text-stone">
                    {tracking}
                  </span>
                </div>
                <p
                  className={`text-foreground ${fontClass} ${extraClass ?? ""}`}
                >
                  {sample}
                </p>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
