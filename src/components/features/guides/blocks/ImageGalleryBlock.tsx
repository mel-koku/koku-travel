"use client";

import Image from "next/image";
import { urlFor } from "@/sanity/image";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

type GalleryImage = {
  _key?: string;
  asset: { _ref: string };
  alt: string;
  caption?: string;
};

type ImageGalleryProps = {
  value: {
    images: GalleryImage[];
    layout?: "grid" | "masonry" | "side-by-side";
  };
};

export function ImageGalleryBlock({ value }: ImageGalleryProps) {
  const { images, layout = "grid" } = value;
  if (!images?.length) return null;

  const layoutClass =
    layout === "side-by-side"
      ? "grid grid-cols-2 gap-4"
      : layout === "masonry"
        ? "columns-2 gap-4 space-y-4"
        : images.length === 2
          ? "grid grid-cols-2 gap-4"
          : "grid grid-cols-2 lg:grid-cols-3 gap-4";

  return (
    <ScrollReveal className="mx-auto my-12 max-w-5xl px-4" distance={40}>
      <div className={layoutClass}>
        {images.map((image, i) => {
          const src = urlFor(image).width(800).quality(85).url();

          if (layout === "masonry") {
            return (
              <div key={image._key || i} className="break-inside-avoid">
                <div className="overflow-hidden rounded-xl">
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
                  <p className="mt-2 text-center font-mono text-xs text-stone">
                    {image.caption}
                  </p>
                )}
              </div>
            );
          }

          return (
            <div key={image._key || i}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <Image
                  src={src}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1280px) 40vw, 50vw"
                />
              </div>
              {image.caption && (
                <p className="mt-2 text-center font-mono text-xs text-stone">
                  {image.caption}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </ScrollReveal>
  );
}
