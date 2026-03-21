"use client";

import Image from "next/image";
import { urlFor } from "@/sanity/image";

type GalleryImage = {
  _key?: string;
  asset: { _ref: string };
  alt: string;
  caption?: string;
};

type ImageGalleryCProps = {
  value: {
    images: GalleryImage[];
    layout?: "grid" | "masonry" | "side-by-side";
  };
};

export function ImageGalleryBlockC({ value }: ImageGalleryCProps) {
  const { images, layout = "grid" } = value;
  if (!images?.length) return null;

  const layoutClass =
    layout === "side-by-side"
      ? "grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-2"
      : layout === "masonry"
        ? "columns-1 gap-4 space-y-4 sm:columns-2"
        : images.length === 2
          ? "grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-2"
          : "grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3";

  const isBorderGrid = layout !== "masonry";

  return (
    <div className="my-12">
      <div className={isBorderGrid ? `border border-[var(--border)] ${layoutClass}` : layoutClass}>
        {images.map((image, i) => {
          const src = urlFor(image).width(800).quality(85).url();

          if (layout === "masonry") {
            return (
              <div key={image._key || i} className="break-inside-avoid">
                <div className="overflow-hidden border border-[var(--border)]">
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
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    {image.caption}
                  </p>
                )}
              </div>
            );
          }

          return (
            <div key={image._key || i} className="bg-[var(--background)]">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={src}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1280px) 40vw, 50vw"
                />
              </div>
              {image.caption && (
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
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
