import type { Location, LocationDetails } from "@/types/location";
import { StarIcon } from "./StarIcon";

type LocationDetailsSectionsProps = {
  location: Location;
  details: LocationDetails;
};

/**
 * Get the best available description for the detail modal.
 * Prefers the longest, most complete description available.
 */
function getBestDescription(location: Location, details: LocationDetails): string | undefined {
  const candidates = [
    location.description,
    location.shortDescription,
    details.editorialSummary,
  ].filter((d): d is string => Boolean(d?.trim()));

  if (candidates.length === 0) return undefined;

  // Prefer the longest description that ends with proper punctuation
  const complete = candidates.filter((d) => /[.!?]$/.test(d.trim()));
  if (complete.length > 0) {
    return complete.reduce((a, b) => (a.length > b.length ? a : b));
  }

  // Fall back to longest available
  return candidates.reduce((a, b) => (a.length > b.length ? a : b));
}

/**
 * Location details sections component.
 * Reviews section removed to reduce Google API costs - rating/reviewCount are cached in database.
 */
export function LocationDetailsSections({ location, details }: LocationDetailsSectionsProps) {
  const description = getBestDescription(location, details);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-sage/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sage">
          {location.category}
        </span>
        {details.rating ? (
          <span className="flex items-center gap-1 text-sm font-medium text-foreground-secondary">
            <StarIcon />
            {details.rating.toFixed(1)}
            {details.userRatingCount ? (
              <span className="text-xs text-stone">
                ({details.userRatingCount.toLocaleString()} reviews)
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      <div className="space-y-6">
        {description ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone">
              Overview
            </h3>
            <p className="text-sm text-foreground-secondary leading-relaxed">{description}</p>
          </section>
        ) : null}

        {details.formattedAddress ? (
          <section className="space-y-1">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone">
              Address
            </h3>
            <p className="text-sm text-foreground-secondary">{details.formattedAddress}</p>
          </section>
        ) : null}

        {details.websiteUri || details.internationalPhoneNumber || details.googleMapsUri ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone">
              Details
            </h3>
            <ul className="space-y-1 text-sm text-sage">
              {details.websiteUri ? (
                <li>
                  <a
                    href={details.websiteUri}
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:underline"
                  >
                    Official website
                  </a>
                </li>
              ) : null}
              {details.internationalPhoneNumber ? (
                <li className="text-foreground-secondary">{details.internationalPhoneNumber}</li>
              ) : null}
              {details.googleMapsUri ? (
                <li>
                  <a
                    href={details.googleMapsUri}
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:underline"
                  >
                    View on Google Maps
                  </a>
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}

        {(details.currentOpeningHours?.length ?? 0) > 0 ||
        (details.regularOpeningHours?.length ?? 0) > 0 ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone">
              Opening hours
            </h3>
            <ul className="space-y-1 text-sm text-foreground-secondary">
              {(details.currentOpeningHours ?? details.regularOpeningHours ?? []).map(
                (entry) => (
                  <li key={entry}>{entry}</li>
                ),
              )}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}

