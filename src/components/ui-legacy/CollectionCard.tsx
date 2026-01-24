import { ComponentPropsWithoutRef } from "react";

import { Badge, BadgeTone, Tag } from "./Badge";
import { Card, CardContent, CardFooter } from "./Card";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

type CollectionCardProps = {
  title: string;
  description: string;
  theme: string;
  tripCount?: number;
  tags?: Array<{ label: string; tone?: BadgeTone }>;
  ctaLabel?: string;
  onCtaClick?: () => void;
} & ComponentPropsWithoutRef<typeof Card>;

export const CollectionCard = ({
  title,
  description,
  theme,
  tripCount,
  tags = [],
  ctaLabel = "View guide",
  onCtaClick,
  className,
  ...rest
}: CollectionCardProps) => (
  <Card padding="lg" className={cn("h-full gap-6", className)} {...rest}>
    <Badge tone="secondary" variant="soft" className="w-fit uppercase tracking-[0.3em]">
      {theme}
    </Badge>

    <CardContent padded={false} className="gap-5">
      <div className="space-y-3">
        <h3 className="text-2xl font-semibold text-neutral-textPrimary">{title}</h3>
        <p className="text-sm text-neutral-textSecondary">{description}</p>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(({ label, tone }) => (
            <Tag key={label} tone={tone}>
              {label}
            </Tag>
          ))}
        </div>
      )}
    </CardContent>

    <CardFooter padded={false} className="items-center justify-between gap-3 pt-0">
      <div className="flex items-center gap-2 text-sm text-neutral-textSecondary">
        {tripCount !== undefined && (
          <>
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full bg-brand-secondary/80"
              aria-hidden="true"
            />
            <span>{tripCount} curated stops</span>
          </>
        )}
      </div>
      <Button
        variant="ghost"
        className="font-semibold text-brand-secondary hover:bg-brand-secondary/10"
        onClick={onCtaClick}
      >
        {ctaLabel}
      </Button>
    </CardFooter>
  </Card>
);

