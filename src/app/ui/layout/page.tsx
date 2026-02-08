import { Container } from "@/components/layouts/Container";
import { Grid } from "@/components/layouts/Grid";
import { Section } from "@/components/layouts/Section";

const cardCopies = Array.from({ length: 6 }, (_, index) => (
  <div key={`card-${index}`} className="flex items-center justify-center">
    <div className="h-24 w-full rounded-xl border border-border bg-background shadow-sm transition hover:shadow md:h-28" />
  </div>
));

export default function LayoutShowcasePage() {
  return (
    <div className="flex flex-col gap-16 pb-24">
      <Section
        title="Content Modules"
        description="Sections keep a steady vertical rhythm, while the Grid balances multi-column layouts across screen sizes."
      >
        <Grid>{cardCopies}</Grid>
      </Section>

      <Section
        bleed
        className="bg-background border-y border-border"
        title="Full-bleed Highlight"
        description="Use the bleed option when a color band or texture should stretch edge-to-edge, while content stays aligned with the Container."
      >
        <Grid cols={3} gap="md">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={`feature-${index}`} className="space-y-3">
              <div className="h-24 rounded-xl border border-border bg-background" />
              <div className="h-2 w-24 rounded bg-surface" />
              <div className="h-2 w-32 rounded bg-surface" />
            </div>
          ))}
        </Grid>
      </Section>

      <Section
        title="Container Widths"
        description="Desktop max-width tokens help keep layouts calm. Each tightens progressively on smaller breakpoints."
      >
        <div className="space-y-6">
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <div
              key={size}
              className="rounded-2xl border border-dashed border-border bg-background/70 p-4"
            >
              <Container size={size}>
                <div className="rounded-xl border border-border bg-background p-6 text-sm text-foreground-secondary sm:p-4">
                  <p className="font-medium uppercase tracking-wide text-stone">
                    size={size}
                  </p>
                  <p className="mt-2 text-foreground-secondary">
                    The Container constrains content to {size.toUpperCase()}{" "}
                    widths on desktop, then eases padding on tablet and mobile.
                  </p>
                </div>
              </Container>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}


