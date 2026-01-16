"use client";

import { useMemo } from "react";
import { TRIP_TEMPLATES, type TripTemplate } from "@/data/tripTemplates";
import { REGIONS } from "@/data/regions";
import { Button } from "@/components/ui/Button";

type TemplateSelectorProps = {
  onSelectTemplate: (template: TripTemplate) => void;
  onStartFromScratch: () => void;
};

const TEMPLATE_ICONS: Record<string, string> = {
  "classic-tokyo": "🗼",
  "kyoto-cultural": "⛩️",
  "golden-route": "🚄",
  "osaka-foodie": "🍜",
  "kansai-explorer": "🦌",
  "tokyo-yokohama": "🌃",
};

function getCityNames(cityIds: string[]): string {
  const cityNames: string[] = [];
  for (const region of REGIONS) {
    for (const city of region.cities) {
      if (cityIds.includes(city.id)) {
        cityNames.push(city.name);
      }
    }
  }
  return cityNames.join(", ");
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: TripTemplate;
  onSelect: () => void;
}) {
  const cityNames = useMemo(() => getCityNames(template.cities), [template.cities]);
  const icon = TEMPLATE_ICONS[template.id] || "✈️";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-3xl" role="img" aria-label={template.name}>
          {icon}
        </span>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
          {template.duration} days
        </span>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-700">
        {template.name}
      </h3>

      <p className="mt-1.5 line-clamp-2 text-sm text-gray-600">
        {template.description}
      </p>

      <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
          />
        </svg>
        <span>{cityNames}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {template.highlights.slice(0, 3).map((highlight) => (
          <span
            key={highlight}
            className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
          >
            {highlight}
          </span>
        ))}
        {template.highlights.length > 3 && (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            +{template.highlights.length - 3} more
          </span>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <span className="text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
          Use this template →
        </span>
      </div>
    </button>
  );
}

export function TemplateSelector({
  onSelectTemplate,
  onStartFromScratch,
}: TemplateSelectorProps) {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-2 sm:gap-3">
        <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
          Choose a starting point
        </h2>
        <p className="text-sm text-gray-600 sm:text-base">
          Pick a template to get started quickly, or build your trip from scratch.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRIP_TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={() => onSelectTemplate(template)}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Prefer to customize everything yourself?
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={onStartFromScratch}
          className="min-h-[44px]"
        >
          Start from scratch
        </Button>
      </div>
    </div>
  );
}
