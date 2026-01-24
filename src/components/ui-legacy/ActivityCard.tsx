import { ComponentPropsWithoutRef } from "react";

import { Badge, BadgeTone, Tag } from "./Badge";
import { Card, CardContent } from "./Card";
import { cn } from "@/lib/utils";

type ActivityCardTag = {
  label: string;
  tone?: BadgeTone;
};

type ActivityCardProps = {
  /**
   * Timeslot or duration for the activity, e.g. "09:00 – 11:30".
   */
  timeRange: string;
  /**
   * Display name for the activity.
   */
  title: string;
  /**
   * Optional city or venue to highlight.
   */
  location?: string;
  /**
   * Short blurb describing the experience.
   */
  description?: string;
  /**
   * Key details or amenities rendered as bullet points.
   */
  highlights?: string[];
  /**
   * Labels for category or vibe.
   */
  tags?: ActivityCardTag[];
} & ComponentPropsWithoutRef<typeof Card>;

export const ActivityCard = ({
  timeRange,
  title,
  location,
  description,
  highlights = [],
  tags = [],
  className,
  ...rest
}: ActivityCardProps) => (
  <Card
    padding="lg"
    className={cn("gap-6 md:flex-row md:items-start", className)}
    {...rest}
  >
    <div className="flex flex-col gap-4 md:w-40">
      <Badge tone="brand" variant="soft" className="w-fit">
        {timeRange}
      </Badge>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(({ label, tone }) => (
            <Tag key={label} tone={tone}>
              {label}
            </Tag>
          ))}
        </div>
      )}
    </div>

    <CardContent
      padded={false}
      className="gap-4 md:flex-1"
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-xl font-semibold text-neutral-textPrimary">{title}</h3>
          {location && <span className="text-sm font-medium text-brand-primary">{location}</span>}
        </div>
        {description && <p className="text-sm text-neutral-textSecondary">{description}</p>}
      </div>

      {highlights.length > 0 && (
        <ul className="grid gap-2 text-sm text-neutral-textSecondary sm:grid-cols-2">
          {highlights.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span
                className="inline-flex h-1.5 w-1.5 rounded-full bg-brand-primary"
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

