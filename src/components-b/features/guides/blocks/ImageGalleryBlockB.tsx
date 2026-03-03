"use client";

import Image from "next/image";
import { urlFor } from "@/sanity/image";

type GalleryImage = {
  _key?: string;
  asset: { _ref: string };
  alt: string;
  caption?: string;
};

type ImageGalleryBProps = {
  value: {
    images: GalleryImage[];
    layout?: "grid" | "masonry" | "side-by-side";
  };
};

export function ImageGalleryBlockB({ value }: ImageGalleryBProps) {
  const { images, layout = "grid" } = value;
  if (!images?.length) return null;

  const layoutClass =
    layout === "side-by-side"
      ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
      : layout === "masonry"
        ? "columns-1 sm:columns-2 gap-4 space-y-4"
        : images.length === 2
          ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

  return (
    <div className="mx-auto my-12 max-w-6xl px-4">
      <div className={layoutClass}>
        {images.map((image, i) => {
          const src = urlFor(image).width(800).quality(85).url();

          if (layout === "masonry") {
            return (
              <div key={image._key || i} className="break-inside-avoid">
                <div className="overflow-hidden rounded-2xl">
                  <Image
                    src={src}
                    alt={image.alt}
                    width={800}
                    height={600}
                    className="w-full object-cover"
                    sizes="(min-width: 1280px) 40vw, 50vw"
                  />
                </div>
                {image.caption && (
                  <p
                    className="mt-2 text-center text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {image.caption}
                  </p>
                )}
              </div>
            );
          }

          return (
            <div key={image._key || i}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <Image
                  src={src}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1280px) 40vw, 50vw"
                />
              </div>
              {image.caption && (
                <p
                  className="mt-2 text-center text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {image.caption}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
