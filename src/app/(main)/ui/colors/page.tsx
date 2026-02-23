type SwatchProps = {
  name: string;
  token: string;
  hex: string;
  cssVar?: string;
  className: string;
  textClass?: string;
};

function Swatch({ name, token, hex, cssVar, className, textClass = "text-white" }: SwatchProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`flex h-20 items-end rounded-xl p-3 shadow-card ${className}`}>
        <span className={`text-xs font-semibold ${textClass}`}>{hex}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-charcoal">{name}</p>
        <p className="font-mono text-xs text-stone">{token}</p>
        {cssVar && <p className="font-mono text-xs text-warm-gray">{cssVar}</p>}
      </div>
    </div>
  );
}

type CategoryRowProps = {
  categories: string;
  color: string;
  hex: string;
  swatchClass: string;
  rationale: string;
};

function CategoryRow({ categories, color, hex, swatchClass, rationale }: CategoryRowProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-background/60 px-4 py-3">
      <div className={`h-8 w-8 shrink-0 rounded-lg ${swatchClass}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-charcoal">{categories}</p>
        <p className="text-xs text-warm-gray">{rationale}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-xs text-stone">{color}</p>
        <p className="font-mono text-xs text-warm-gray">{hex}</p>
      </div>
    </div>
  );
}

export default function ColorsDemoPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-10 py-16">
      <header className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Design System
        </span>
        <h1 className="font-serif italic text-4xl leading-tight text-charcoal">
          Color Palette
        </h1>
        <p className="max-w-2xl text-lg text-warm-gray">
          Warm parchment atmospherics, deep crimson and lantern amber for structure,
          jade teal and gold for accents.
        </p>
      </header>

      {/* Color Distribution */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif italic text-2xl text-charcoal">Color Distribution</h2>
          <p className="text-sm text-warm-gray">
            Dominant atmosphere, secondary structure, accent focal points.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/40 bg-surface/60 p-5">
            <p className="font-mono text-3xl font-bold text-charcoal">60%</p>
            <p className="mt-1 text-sm font-medium text-charcoal">Atmosphere</p>
            <p className="mt-2 text-xs text-warm-gray">
              Warm parchment backgrounds, cream surfaces, gilded sand borders. Sets the
              calm, inviting tone.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-5">
            <p className="font-mono text-3xl font-bold text-brand-primary">30%</p>
            <p className="mt-1 text-sm font-medium text-charcoal">Structure</p>
            <p className="mt-2 text-xs text-warm-gray">
              Deep crimson, lantern amber, dark wood text. Provides hierarchy, headings,
              interactive elements.
            </p>
          </div>
          <div className="rounded-2xl border border-sage/20 bg-sage/5 p-5">
            <p className="font-mono text-3xl font-bold text-sage">10%</p>
            <p className="mt-1 text-sm font-medium text-charcoal">Accent</p>
            <p className="mt-2 text-xs text-warm-gray">
              Jade teal, bright gold, vermillion. Draws the eye to CTAs, success states,
              and warnings.
            </p>
          </div>
        </div>
      </section>

      {/* 60% Dominant */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif italic text-2xl text-charcoal">
            Dominant &mdash; Atmosphere
          </h2>
          <p className="text-sm text-warm-gray">
            Page backgrounds, card surfaces, and borders. These set the warm parchment foundation.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Swatch
            name="Background"
            token="bg-background"
            hex="#faf5ef"
            cssVar="--background"
            className="bg-background border border-border"
            textClass="text-charcoal"
          />
          <Swatch
            name="Surface"
            token="bg-surface"
            hex="#f2ebe0"
            cssVar="--surface"
            className="bg-surface"
            textClass="text-charcoal"
          />
          <Swatch
            name="Border / Sand"
            token="border-border"
            hex="#e3d5c3"
            cssVar="--border"
            className="bg-sand"
            textClass="text-charcoal"
          />
          <Swatch
            name="Cream"
            token="bg-cream"
            hex="#f2ebe0"
            cssVar="--cream"
            className="bg-cream"
            textClass="text-charcoal"
          />
        </div>
      </section>

      {/* 30% Secondary */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif italic text-2xl text-charcoal">
            Secondary &mdash; Structure &amp; Depth
          </h2>
          <p className="text-sm text-warm-gray">
            Brand colors, text hierarchy, and interactive elements. These carry the Koku identity.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <Swatch
            name="Brand Primary"
            token="brand-primary"
            hex="#8c2f2f"
            cssVar="--brand-primary"
            className="bg-brand-primary"
          />
          <Swatch
            name="Brand Secondary"
            token="brand-secondary"
            hex="#c6923a"
            cssVar="--brand-secondary"
            className="bg-brand-secondary"
          />
          <Swatch
            name="Charcoal"
            token="text-charcoal"
            hex="#1f1a14"
            cssVar="--charcoal"
            className="bg-charcoal"
          />
          <Swatch
            name="Warm Gray"
            token="text-warm-gray"
            hex="#5a4f44"
            cssVar="--warm-gray"
            className="bg-warm-gray"
          />
          <Swatch
            name="Stone"
            token="text-stone"
            hex="#9a8d7e"
            cssVar="--stone"
            className="bg-stone"
          />
        </div>
      </section>

      {/* 10% Accent */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif italic text-2xl text-charcoal">
            Accent &mdash; Focal Points
          </h2>
          <p className="text-sm text-warm-gray">
            Success states, warnings, and destructive actions. Used sparingly to draw attention.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Swatch
            name="Sage / Success"
            token="bg-sage"
            hex="#2d7a6f"
            cssVar="--sage"
            className="bg-sage"
          />
          <Swatch
            name="Warning"
            token="text-warning"
            hex="#d4a017"
            cssVar="--warning"
            className="bg-warning"
          />
          <Swatch
            name="Destructive / Error"
            token="bg-destructive"
            hex="#b33025"
            cssVar="--error"
            className="bg-destructive"
          />
        </div>
      </section>

      {/* Dark Mode */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif italic text-2xl text-charcoal">Dark Mode</h2>
          <p className="text-sm text-warm-gray">
            Colors shift to glow against inky backgrounds while preserving
            the warm atmosphere.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <Swatch
            name="Background"
            token="--background"
            hex="#151210"
            className="border border-border"
            textClass="text-warm-gray"
            cssVar="dark"
          />
          <Swatch
            name="Surface / Card"
            token="--card"
            hex="#221e1a"
            className="border border-border"
            textClass="text-warm-gray"
            cssVar="dark"
          />
          <Swatch
            name="Primary"
            token="--primary"
            hex="#c4504f"
            className="bg-[#c4504f]"
          />
          <Swatch
            name="Accent"
            token="--accent"
            hex="#3da193"
            className="bg-[#3da193]"
          />
          <Swatch
            name="Border"
            token="--border"
            hex="#352f29"
            className="bg-[#352f29]"
            textClass="text-warm-gray"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Swatch
            name="Foreground"
            token="--foreground"
            hex="#f0e8dc"
            className="bg-[#f0e8dc]"
            textClass="text-charcoal"
          />
          <Swatch
            name="Brand Secondary"
            token="--brand-secondary"
            hex="#daa54e"
            className="bg-[#daa54e]"
          />
          <Swatch
            name="Destructive"
            token="--destructive"
            hex="#d44535"
            className="bg-[#d44535]"
          />
        </div>
      </section>

      {/* Activity Category Colors */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif italic text-2xl text-charcoal">
            Activity Category Colors
          </h2>
          <p className="text-sm text-warm-gray">
            Each activity category has a distinct color on itinerary cards and map pins for
            quick visual scanning. Previously all monotone; now differentiated.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <CategoryRow
            categories="Culture, View, Point of Interest"
            color="brand-primary"
            hex="#8c2f2f"
            swatchClass="bg-brand-primary"
            rationale="Bathhouse crimson — temples, shrines, cultural landmarks"
          />
          <CategoryRow
            categories="Food, Breakfast, Lunch, Dinner, Snack"
            color="brand-secondary"
            hex="#c6923a"
            swatchClass="bg-brand-secondary"
            rationale="Lantern amber — warm, inviting food experiences"
          />
          <CategoryRow
            categories="Nature"
            color="sage"
            hex="#2d7a6f"
            swatchClass="bg-sage"
            rationale="Jade teal — forests, gardens, water, Haku's spirit"
          />
          <CategoryRow
            categories="Shopping"
            color="warning"
            hex="#d4a017"
            swatchClass="bg-warning"
            rationale="Bright gold — markets, shops, treasure"
          />
          <CategoryRow
            categories="Entertainment"
            color="brand-secondary"
            hex="#c6923a"
            swatchClass="bg-brand-secondary"
            rationale="Amber — festive, lively experiences"
          />
          <CategoryRow
            categories="Travel, Transport"
            color="warm-gray"
            hex="#5a4f44"
            swatchClass="bg-warm-gray"
            rationale="Warm gray — utilitarian, functional movement"
          />
          <CategoryRow
            categories="Hotel, Note"
            color="stone"
            hex="#9a8d7e"
            swatchClass="bg-stone"
            rationale="Stone — restful, informational"
          />
          <CategoryRow
            categories="Entry Points"
            color="sage"
            hex="#2d7a6f"
            swatchClass="bg-sage"
            rationale="Jade teal — journey markers, start/end points"
          />
        </div>
      </section>

      {/* Token Reference */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif italic text-2xl text-charcoal">Token Reference</h2>
          <p className="text-sm text-warm-gray">
            Use design tokens instead of raw Tailwind colors (no <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">gray-*</code>,{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">indigo-*</code>,{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">red-*</code>).
            Exception: transport-mode functional colors in TravelModeSelector.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border/40">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-surface/50">
                <th className="px-4 py-3 font-semibold text-charcoal">Purpose</th>
                <th className="px-4 py-3 font-semibold text-charcoal">Tailwind Class</th>
                <th className="px-4 py-3 font-semibold text-charcoal">CSS Variable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              <tr>
                <td className="px-4 py-2.5 text-warm-gray">Page background</td>
                <td className="px-4 py-2.5 font-mono text-xs text-charcoal">bg-background</td>
                <td className="px-4 py-2.5 font-mono text-xs text-stone">--background</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-warm-gray">Card / panel surface</td>
                <td className="px-4 py-2.5 font-mono text-xs text-charcoal">bg-surface</td>
                <td className="px-4 py-2.5 font-mono text-xs text-stone">--surface</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-warm-gray">Borders</td>
                <td className="px-4 py-2.5 font-mono text-xs text-charcoal">border-border</td>
                <td className="px-4 py-2.5 font-mono text-xs text-stone">--border</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-warm-gray">Primary text</td>
                <td className="px-4 py-2.5 font-mono text-xs text-charcoal">text-charcoal</td>
                <td className="px-4 py-2.5 font-mono text-xs text-stone">--charcoal</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-warm-gray">Secondary text</td>
                <td className="px-4 py-2.5 font-mono text-xs text-charcoal">text-warm-gray</td>
                <td className="px-4 py-2.5 font-mono text-xs text-stone">--warm-gray</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-warm-gray">Labels / captions</td>
                <td className="px-4 py-2.5 font-mono text-xs text-charcoal">text-stone</td>
                <td className="px-4 py-2.5 font-mono text-xs text-stone">--stone</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-warm-gray">Primary brand / CTA</td>
                <td className="px-4 py-2.5 font-mono text-xs text-charcoal">bg-brand-primary</td>
                <td className="px-4 py-2.5 font-mono text-xs text-stone">--brand-primary</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-warm-gray">Secondary brand / food</td>
                <td className="px-4 py-2.5 font-mono text-xs text-charcoal">bg-brand-secondary</td>
                <td className="px-4 py-2.5 font-mono text-xs text-stone">--brand-secondary</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-warm-gray">Success / nature</td>
                <td className="px-4 py-2.5 font-mono text-xs text-charcoal">bg-sage</td>
                <td className="px-4 py-2.5 font-mono text-xs text-stone">--sage</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-warm-gray">Warning / highlights</td>
                <td className="px-4 py-2.5 font-mono text-xs text-charcoal">text-warning</td>
                <td className="px-4 py-2.5 font-mono text-xs text-stone">--warning</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-warm-gray">Error / destructive</td>
                <td className="px-4 py-2.5 font-mono text-xs text-charcoal">text-destructive</td>
                <td className="px-4 py-2.5 font-mono text-xs text-stone">--error</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Box Shadows */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif italic text-2xl text-charcoal">Box Shadows</h2>
          <p className="text-sm text-warm-gray">
            Warm-tinted shadows using <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">rgba(31, 26, 20, ...)</code> instead
            of pure black for cohesion with the parchment aesthetic.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/30 bg-background p-6">
            <div className="h-16 w-full rounded-xl bg-background shadow-card" />
            <div className="text-center">
              <p className="text-sm font-medium text-charcoal">shadow-card</p>
              <p className="font-mono text-xs text-stone">Cards, badges</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/30 bg-background p-6">
            <div className="h-16 w-full rounded-xl bg-background shadow-soft" />
            <div className="text-center">
              <p className="text-sm font-medium text-charcoal">shadow-soft</p>
              <p className="font-mono text-xs text-stone">Modals, popovers</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/30 bg-background p-6">
            <div className="h-16 w-full rounded-xl bg-background shadow-depth" />
            <div className="text-center">
              <p className="text-sm font-medium text-charcoal">shadow-depth</p>
              <p className="font-mono text-xs text-stone">Hero sections, elevated</p>
            </div>
          </div>
        </div>
      </section>

      {/* WCAG Contrast */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif italic text-2xl text-charcoal">Contrast Check</h2>
          <p className="text-sm text-warm-gray">
            Key foreground/background pairs meet WCAG AA contrast requirements.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-xl bg-background px-5 py-4 shadow-card">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-charcoal text-xs font-bold text-background">
              Aa
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal">Charcoal on Background</p>
              <p className="font-mono text-xs text-stone">#1f1a14 / #faf5ef &mdash; 15.5:1</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-brand-primary px-5 py-4 shadow-card">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xs font-bold text-brand-primary">
              Aa
            </div>
            <div>
              <p className="text-sm font-medium text-white">White on Brand Primary</p>
              <p className="font-mono text-xs text-white/70">#ffffff / #8c2f2f &mdash; 6.5:1</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-sage px-5 py-4 shadow-card">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xs font-bold text-sage">
              Aa
            </div>
            <div>
              <p className="text-sm font-medium text-white">White on Sage</p>
              <p className="font-mono text-xs text-white/70">#ffffff / #2d7a6f &mdash; 4.8:1</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-background px-5 py-4 shadow-card">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning text-xs font-bold text-white">
              Aa
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal">Warning (large text only)</p>
              <p className="font-mono text-xs text-stone">#d4a017 / #faf5ef &mdash; 2.8:1</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
