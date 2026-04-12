"use client";

/**
 * Wraps next-themes ThemeProvider to suppress the React 19 console warning
 * about <script> tags rendered inside client components.
 *
 * next-themes injects an inline script for FOUC prevention. React 19 warns
 * about this even though the script executes correctly. We suppress the
 * specific console.error for this known false-positive.
 */

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

function useSuppressThemeScriptWarning() {
  useEffect(() => {
    // eslint-disable-next-line no-console
    const originalError = console.error;
    // eslint-disable-next-line no-console
    console.error = (...args: unknown[]) => {
      const msg = typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("Encountered a script tag while rendering React component")) {
        return; // Swallow known next-themes false-positive
      }
      originalError.apply(console, args);
    };
    return () => {
      // eslint-disable-next-line no-console
      console.error = originalError;
    };
  }, []);
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  useSuppressThemeScriptWarning();
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
