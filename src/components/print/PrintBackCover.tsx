import { typography } from "@/lib/typography-system";

export function PrintBackCover() {
  return (
    <article className="print-page print-page-fixed">
      <div className="print-page-inner justify-between items-center text-center">
        <div />

        <div className="space-y-6 max-w-[90mm]">
          <hr className="print-rule-vermilion mx-auto" />
          <p className={typography({ intent: "editorial-quote" })}>
            The best trips are not the ones that fill every hour, but the ones
            that leave room for the hour to fill itself.
          </p>
          <hr className="print-rule-vermilion mx-auto" />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[8pt] uppercase tracking-[0.22em] text-foreground-secondary">
            Yuku Japan
          </p>
          <p className="font-mono text-[7.5pt] uppercase tracking-[0.18em] text-foreground-secondary">
            yukujapan.com
          </p>
        </div>
      </div>
    </article>
  );
}
