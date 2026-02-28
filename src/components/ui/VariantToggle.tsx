"use client";

import { usePathname, useRouter } from "next/navigation";
import { useVariant } from "@/lib/variant/VariantContext";

/**
 * Temporary A/B variant toggle for testing.
 * Remove before going public.
 */
export function VariantToggle() {
  const { variant } = useVariant();
  const pathname = usePathname();
  const router = useRouter();

  const handleToggle = () => {
    let targetPath: string;

    if (variant === "a") {
      // A → B: prepend /b
      const path = pathname === "/" ? "/" : pathname;
      targetPath = `/b${path}`;
    } else {
      // B → A: strip /b prefix
      const stripped = pathname.replace(/^\/b/, "");
      targetPath = stripped || "/";
    }

    router.push(targetPath);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="relative flex h-7 items-center rounded-full p-0.5 text-xs font-semibold transition-colors"
      style={{
        width: "3.25rem",
        backgroundColor:
          variant === "a"
            ? "rgba(196, 80, 79, 0.15)"
            : "rgba(45, 75, 142, 0.12)",
      }}
      aria-label={`Switch to variant ${variant === "a" ? "B" : "A"}`}
      title={`Switch to variant ${variant === "a" ? "B" : "A"}`}
    >
      {/* Sliding pill */}
      <span
        className="absolute top-0.5 h-6 w-6 rounded-full shadow-sm transition-all duration-200 ease-out"
        style={{
          left: variant === "a" ? "2px" : "calc(100% - 26px)",
          backgroundColor: variant === "a" ? "#c4504f" : "#2D4B8E",
        }}
      />
      {/* Labels */}
      <span
        className="relative z-10 flex h-6 w-6 items-center justify-center transition-colors duration-200"
        style={{
          color: variant === "a" ? "#fff" : variant === "b" ? "#2D4B8E" : undefined,
        }}
      >
        A
      </span>
      <span
        className="relative z-10 flex h-6 w-6 items-center justify-center transition-colors duration-200"
        style={{
          color: variant === "b" ? "#fff" : variant === "a" ? "#c4504f" : undefined,
        }}
      >
        B
      </span>
    </button>
  );
}
