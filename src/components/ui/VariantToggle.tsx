"use client";

import { usePathname, useRouter } from "next/navigation";
import { useVariant } from "@/lib/variant/VariantContext";

const VARIANT_COLORS = {
  a: "#c4504f",
  b: "#2D4B8E",
  c: "#e63312",
} as const;

const VARIANT_ORDER = ["a", "b", "c"] as const;

/**
 * Temporary A/B/C variant toggle for testing.
 * Remove before going public.
 */
export function VariantToggle() {
  const { variant } = useVariant();
  const pathname = usePathname();
  const router = useRouter();

  const handleCycle = () => {
    const currentIdx = VARIANT_ORDER.indexOf(variant);
    const nextVariant = VARIANT_ORDER[(currentIdx + 1) % VARIANT_ORDER.length]!;

    // Strip current variant prefix
    let basePath = pathname;
    if (variant === "b") basePath = pathname.replace(/^\/b/, "") || "/";
    if (variant === "c") basePath = pathname.replace(/^\/c/, "") || "/";

    // Add next variant prefix
    let targetPath: string;
    if (nextVariant === "a") {
      targetPath = basePath;
    } else {
      targetPath = `/${nextVariant}${basePath}`;
    }

    router.push(targetPath);
  };

  if (
    process.env.NODE_ENV !== "development" &&
    !process.env.NEXT_PUBLIC_SHOW_VARIANT_TOGGLE
  )
    return null;

  return (
    <button
      type="button"
      onClick={handleCycle}
      className="flex h-7 items-center justify-center gap-0.5 px-2 text-xs font-bold uppercase tracking-wide transition-colors"
      style={{
        backgroundColor: `${VARIANT_COLORS[variant]}15`,
        color: VARIANT_COLORS[variant],
        borderRadius: variant === "c" ? "0px" : "9999px",
        minWidth: "2.5rem",
      }}
      aria-label={`Current variant: ${variant.toUpperCase()}. Click to cycle.`}
      title={`Variant ${variant.toUpperCase()} — click to switch`}
    >
      {variant.toUpperCase()}
    </button>
  );
}
