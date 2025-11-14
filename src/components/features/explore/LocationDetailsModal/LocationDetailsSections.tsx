import type { Location, LocationDetails } from "@/types/location";
import { StarIcon } from "./StarIcon";

type LocationDetailsSectionsProps = {
  location: Location;
  details: LocationDetails;
};

export function LocationDetailsSections({ location, details }: LocationDetailsSectionsProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          {location.category}
        </span>
        {details.rating ? (
          <span className="flex items-center gap-1 text-sm font-medium text-gray-700">
            <StarIcon />
            {details.rating.toFixed(1)}
            {details.userRatingCount ? (
              <span className="text-xs text-gray-500">
                ({details.userRatingCount.toLocaleString()} reviews)
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          {details.editorialSummary ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Overview
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">{details.editorialSummary}</p>
            </section>
          ) : null}

          {details.formattedAddress ? (
            <section className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Address
              </h3>
              <p className="text-sm text-gray-700">{details.formattedAddress}</p>
            </section>
          ) : null}

          {details.websiteUri || details.internationalPhoneNumber || details.googleMapsUri ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Details
              </h3>
              <ul className="space-y-1 text-sm text-indigo-600">
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
                  <li className="text-gray-700">{details.internationalPhoneNumber}</li>
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
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Opening hours
              </h3>
              <ul className="space-y-1 text-sm text-gray-700">
                {(details.currentOpeningHours ?? details.regularOpeningHours ?? []).map(
                  (entry) => (
                    <li key={entry}>{entry}</li>
                  ),
                )}
              </ul>
            </section>
          ) : null}
        </div>

        <LocationReviewsSection details={details} />
      </div>
    </>
  );
}

function LocationReviewsSection({ details }: { details: LocationDetails }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Reviews</h3>
        {details.fetchedAt ? (
          <p className="text-xs text-gray-400">
            Updated {new Date(details.fetchedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
        {details.reviews.length === 0 ? (
          <p className="text-sm text-gray-500">
            Google hasn't published public review snippets for this location yet.
          </p>
        ) : (
          details.reviews.map((review, index) => (
            <article
              key={`${review.authorName}-${review.publishTime ?? index}`}
              className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{review.authorName}</p>
                  {review.relativePublishTimeDescription ? (
                    <p className="text-xs text-gray-500">{review.relativePublishTimeDescription}</p>
                  ) : null}
                </div>
                {review.rating ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-gray-700">
                    <StarIcon />
                    {review.rating.toFixed(1)}
                  </span>
                ) : null}
              </div>
              {review.text ? (
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{review.text}</p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

