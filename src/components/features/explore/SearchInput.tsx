"use client";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = "Search locations...",
}: SearchInputProps) {
  return (
    <div className="relative">
      <label htmlFor="explore-search" className="sr-only">
        Search locations
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
        <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
      </span>
      <input
        id="explore-search"
        type="text"
        className="w-full h-10 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl p-1"
          aria-label="Clear search"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </div>
  );
}

function MagnifyingGlassIcon({
  className,
  ariaHidden,
}: {
  className?: string;
  ariaHidden?: boolean;
}) {
  return (
    <svg
      className={className}
      aria-hidden={ariaHidden ?? true}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.167 15a5.833 5.833 0 1 0 0-11.666 5.833 5.833 0 0 0 0 11.666Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m14.167 14.167 2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

