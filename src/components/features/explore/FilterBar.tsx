import { cn } from "@/lib/cn";

import { SearchInput } from "./SearchInput";
import { CategoryCheckboxDropdown } from "./CategoryCheckboxDropdown";

type FilterBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  cityOptions: readonly { value: string; label: string }[];
  selectedCity: string | null;
  onCityChange: (city: string | null) => void;
  budgetOptions: readonly { value: string; label: string }[];
  selectedBudget: string | null;
  onBudgetChange: (budget: string | null) => void;
  durationOptions: readonly { value: string; label: string }[];
  selectedDuration: string | null;
  onDurationChange: (duration: string | null) => void;
  categoryOptions: readonly { value: string; label: string }[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  tagOptions: readonly { value: string; label: string }[];
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
  layout?: "horizontal" | "vertical";
};

export function FilterBar({
  query,
  onQueryChange,
  cityOptions,
  selectedCity,
  onCityChange,
  budgetOptions,
  selectedBudget,
  onBudgetChange,
  durationOptions,
  selectedDuration,
  onDurationChange,
  categoryOptions,
  selectedCategories,
  onCategoriesChange,
  tagOptions,
  selectedTag,
  onTagChange,
  layout = "horizontal",
}: FilterBarProps) {
  const isVertical = layout === "vertical";

  return (
    <aside
      className={cn(
        "sticky z-40 px-2 transition-all duration-300 ease-out [top:var(--sticky-offset)] sm:px-4",
        isVertical && "lg:h-fit lg:self-start"
      )}
    >
      <div
        className={cn(
          "w-full rounded-2xl border border-border bg-background/90 backdrop-blur shadow-md transition-all duration-300 ease-out hover:shadow-lg",
          isVertical
            ? "space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:max-h-[calc(100vh-var(--sticky-offset)-1rem)] lg:max-w-xs lg:overflow-y-auto lg:pr-4"
            : "mx-auto max-w-5xl space-y-3 px-4 py-3 sm:space-y-4 sm:px-6 sm:py-4"
        )}
      >
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <SearchInput
              value={query}
              onChange={onQueryChange}
              placeholder="Search locations..."
            />
          </div>
        </div>
        <div
          className={cn(
            isVertical
              ? "flex flex-col gap-3 sm:gap-4"
              : "grid gap-3 md:grid-cols-2 lg:grid-cols-5"
          )}
        >
          <CategoryCheckboxDropdown
            label="Category"
            options={categoryOptions}
            selectedValues={selectedCategories}
            onChange={onCategoriesChange}
            placeholder="All categories"
          />
          <FilterSelect
            label="City"
            value={selectedCity ?? ""}
            onChange={(value) => onCityChange(value || null)}
            options={cityOptions}
            placeholder="All cities"
          />
          <FilterSelect
            label="Budget"
            value={selectedBudget ?? ""}
            onChange={(value) => onBudgetChange(value || null)}
            options={budgetOptions}
            placeholder="All budgets"
          />
          <FilterSelect
            label="Duration"
            value={selectedDuration ?? ""}
            onChange={(value) => onDurationChange(value || null)}
            options={durationOptions}
            placeholder="All durations"
          />
          <FilterSelect
            label="Tag"
            value={selectedTag ?? ""}
            onChange={(value) => onTagChange(value || null)}
            options={tagOptions}
            placeholder="All tags"
          />
        </div>
      </div>
    </aside>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder: string;
};

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: FilterSelectProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-warm-gray sm:gap-2">
      <span className="font-medium sm:text-base">{label}</span>
      <div className="relative">
        <select
          className="min-h-[44px] w-full appearance-none rounded-full border border-border bg-background py-2.5 pl-4 pr-11 text-sm text-charcoal shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/50 sm:py-3 sm:text-base"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-stone">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </label>
  );
}


