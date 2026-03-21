"use client";

import { createContext, useContext, useEffect } from "react";

type Variant = "a" | "b" | "c";

type VariantContextValue = {
  variant: Variant;
  basePath: "" | "/b" | "/c";
};

const VariantContext = createContext<VariantContextValue>({
  variant: "a",
  basePath: "",
});

export function VariantProvider({
  variant,
  children,
}: {
  variant: Variant;
  children: React.ReactNode;
}) {
  const basePath = variant === "c" ? "/c" : variant === "b" ? "/b" : "";

  // Sync data-variant to <html> so Radix portals (rendered at body level)
  // inherit the correct CSS custom properties for each variant.
  useEffect(() => {
    document.documentElement.setAttribute("data-variant", variant);
    return () => {
      document.documentElement.removeAttribute("data-variant");
    };
  }, [variant]);

  return (
    <VariantContext.Provider value={{ variant, basePath }}>
      {children}
    </VariantContext.Provider>
  );
}

export function useVariant() {
  return useContext(VariantContext);
}

/** Prefix a path with the variant base (e.g. "/trip-builder" → "/b/trip-builder" in B). */
export function useVariantHref(path: string) {
  const { basePath } = useVariant();
  return `${basePath}${path}`;
}
