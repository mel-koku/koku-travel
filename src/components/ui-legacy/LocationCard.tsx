import { ComponentPropsWithoutRef } from "react";

import { Badge, BadgeTone, Tag } from "./Badge";
import { Card, CardContent } from "./Card";
import { cn } from "@/lib/utils";

type Metric = {
  label: string;
  value: string;
};

type LocationCardProps = {
  title: string;
  prefecture: string;
  description: string;
  imageUrl: string;
  season?: string;
  tags?: Array<{ label: string; tone?: BadgeTone }>;
  metrics?: Metric[];
} & ComponentPropsWithoutRef<typeof Card>;

export const LocationCard = ({
  title,
  prefecture,
  description,
  imageUrl,
  season,
  tags = [],
  metrics = [],
  className,
  ...rest
}: LocationCardProps) => (
  <Card
    padding="none"
    className={cn("h-full overflow-hidden", className)}
    {...rest}
  >
    <div className="relative h-48 bg-gray-200">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
        role="presentation"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/70">Explore</p>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <p className="text-sm text-white/80">{prefecture}</p>
        </div>
        {season && (
          <Badge tone="warning" variant="soft" className="backdrop-blur-md">
            {season}
          </Badge>
        )}
      </div>
    </div>

    <CardContent className="gap-5" padding="md">
      <p className="text-sm text-gray-600">{description}</p>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(({ label, tone }) => (
            <Tag key={label} tone={tone}>
              {label}
            </Tag>
          ))}
        </div>
      )}

      {metrics.length > 0 && (
        <dl className="grid gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600 sm:grid-cols-3">
          {metrics.map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
              <dd className="text-sm font-semibold text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </CardContent>
  </Card>
);

