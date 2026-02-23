"use client";

import { createContext, useContext } from "react";

type Variant = "a" | "b";

type VariantContextValue = {
  variant: Variant;
  basePath: "" | "/b";
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
  const basePath = variant === "b" ? "/b" : "";
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
