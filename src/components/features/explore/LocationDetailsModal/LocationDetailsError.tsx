type LocationDetailsErrorProps = {
  errorMessage: string | null;
  onRetry: () => void;
};

export function LocationDetailsError({ errorMessage, onRetry }: LocationDetailsErrorProps) {
  const humanReadableError =
    errorMessage?.includes("Missing Google Places API key")
      ? "Add a valid GOOGLE_PLACES_API_KEY in your environment to enable live place details."
      : errorMessage ?? "We couldn't load details for this place just now.";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">
        {humanReadableError}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-brand-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

