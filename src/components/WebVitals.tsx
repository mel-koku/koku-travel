"use client";

import { useEffect } from "react";
import { initWebVitals } from "@/lib/web-vitals";

/**
 * WebVitals Component
 * Initializes Web Vitals tracking on the client side
 */
export function WebVitals() {
  useEffect(() => {
    initWebVitals();
  }, []);

  return null;
}

