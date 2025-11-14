import Image from "next/image";
import type { LocationDetails } from "@/types/location";

const FALLBACK_IMAGE_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type LocationPhotosProps = {
  details: LocationDetails;
  heroImageAlt: string;
};

export function LocationPhotos({ details, heroImageAlt }: LocationPhotosProps) {
  const additionalPhotos = details.photos?.length ? details.photos.slice(1) : [];

  if (additionalPhotos.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">More photos</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {additionalPhotos.map((photo) => (
          <figure key={photo.name} className="overflow-hidden rounded-xl">
            <div className="relative h-32 w-full">
              <Image
                src={photo.proxyUrl || FALLBACK_IMAGE_SRC}
                alt={photo.name || heroImageAlt}
                fill
                className="object-cover"
                sizes="(min-width:1024px) 20vw, (min-width:768px) 30vw, 50vw"
              />
            </div>
            {photo.attributions.length > 0 ? (
              <figcaption className="px-2 py-1 text-[11px] text-gray-500">
                Photo by{" "}
                {photo.attributions[0]?.uri ? (
                  <a
                    href={photo.attributions[0].uri}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {photo.attributions[0].displayName ?? "Google contributor"}
                  </a>
                ) : (
                  photo.attributions[0]?.displayName ?? "Google contributor"
                )}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}

