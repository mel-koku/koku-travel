import { SearchInput } from "./SearchInput";

type FilterBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  categories: readonly string[];
  selectedCategory: string | null;
  onCategoryToggle: (category: string) => void;
  cityOptions: readonly { value: string; label: string }[];
  selectedCity: string | null;
  onCityChange: (city: string | null) => void;
  budgetOptions: readonly { value: string; label: string }[];
  selectedBudget: string | null;
  onBudgetChange: (budget: string | null) => void;
  durationOptions: readonly { value: string; label: string }[];
  selectedDuration: string | null;
  onDurationChange: (duration: string | null) => void;
  tagOptions: readonly { value: string; label: string }[];
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
};

export function FilterBar({
  query,
  onQueryChange,
  categories,
  selectedCategory,
  onCategoryToggle,
  cityOptions,
  selectedCity,
  onCityChange,
  budgetOptions,
  selectedBudget,
  onBudgetChange,
  durationOptions,
  selectedDuration,
  onDurationChange,
  tagOptions,
  selectedTag,
  onTagChange,
}: FilterBarProps) {
  return (
    <aside className="sticky [top:var(--sticky-offset)] z-40 px-4 mt-2">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-gray-200 bg-white/90 backdrop-blur px-6 py-4 shadow-md hover:shadow-lg transition space-y-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <div className="flex-1">
            <SearchInput
              value={query}
              onChange={onQueryChange}
              placeholder="Search locations..."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isSelected = selectedCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onCategoryToggle(category)}
                  aria-pressed={isSelected}
                  className={`px-4 py-2 rounded-2xl text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isSelected
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
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
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      <span className="font-medium">{label}</span>
      <select
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
    </label>
  );
}


