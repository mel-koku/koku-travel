"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

/** Emits a custom event when a 401 response is detected so SharedProviders can show a toast */
function emit401() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("koku:session-expired"));
  }
}

/**
 * Query client configuration with sensible defaults for caching
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: (failureCount, error) => {
          // Don't retry 401s — session is expired
          if (error instanceof Error && "status" in error && (error as { status: number }).status === 401) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof Error && error.message?.includes("UNAUTHORIZED")) {
          emit401();
        }
      },
    }),
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a new query client
    return makeQueryClient();
  }
  // Browser: create once and reuse
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

type QueryProviderProps = {
  children: ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
  // Use useState to ensure the same client is used on re-renders
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
