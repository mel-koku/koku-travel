import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode, ComponentType } from "react";

/**
 * Common test patterns for React Context providers.
 * Use these helpers to reduce duplication across context tests.
 */

interface ContextTestConfig<T> {
  /** Context name for test descriptions */
  name: string;
  /** The hook to access context value */
  useHook: () => T;
  /** Provider component */
  Provider: ComponentType<{ children: ReactNode }>;
  /** Optional wrapper for provider (e.g., if it needs parent providers) */
  wrapperBuilder?: (children: ReactNode) => ReactNode;
}

/**
 * Setup localStorage mocking for tests that need persistence
 */
export function setupLocalStorageMock() {
  beforeEach(() => {
    vi.useFakeTimers();
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });
}

/**
 * Create a wrapper function for renderHook that includes providers
 */
export function createContextWrapper<P extends { children: ReactNode }>(
  Provider: ComponentType<P>,
  props?: Omit<P, "children">
) {
  return ({ children }: { children: ReactNode }) => (
    <Provider {...(props as P)}>{children}</Provider>
  );
}

/**
 * Create a nested wrapper for contexts that require parent providers
 */
export function createNestedWrapper(
  providers: ComponentType<{ children: ReactNode }>[]
) {
  return ({ children }: { children: ReactNode }) => {
    return providers.reduceRight(
      (acc, Provider) => <Provider>{acc}</Provider>,
      children
    );
  };
}

/**
 * Generate test for context throwing when used outside provider
 */
export function generateProviderRequiredTest<T>(config: ContextTestConfig<T>) {
  const { name, useHook } = config;

  describe(`${name} Provider Requirement`, () => {
    it("should throw error when used outside provider", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useHook());
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });
}

/**
 * Generate initialization tests for context
 */
export function generateInitializationTests<T>(
  config: ContextTestConfig<T>,
  expectations: {
    checkInitialState: (result: T) => void;
  }
) {
  const { name, useHook, Provider, wrapperBuilder } = config;

  describe(`${name} Initialization`, () => {
    it("should initialize with default values", async () => {
      const wrapper = wrapperBuilder
        ? ({ children }: { children: ReactNode }) => <>{wrapperBuilder(children)}</>
        : createContextWrapper(Provider);

      const { result } = renderHook(() => useHook(), { wrapper });

      await waitFor(() => {
        expectations.checkInitialState(result.current);
      });
    });
  });
}

/**
 * Helper to test localStorage persistence with debounce
 */
export async function testLocalStoragePersistence(
  storageKey: string,
  action: () => void,
  debounceMs: number = 500,
  validateStored: (stored: unknown) => void
) {
  // Perform the action
  act(() => {
    action();
  });

  // Advance timers to trigger debounced write
  act(() => {
    vi.advanceTimersByTime(debounceMs);
  });

  const stored = localStorage.getItem(storageKey);
  expect(stored).toBeTruthy();

  if (stored) {
    const parsed = JSON.parse(stored);
    validateStored(parsed);
  }
}

/**
 * Helper to test context state updates
 */
export async function testContextUpdate<T, R>(
  result: { current: T },
  updateFn: (current: T) => void,
  validateUpdate: (current: T) => R
): Promise<R> {
  act(() => {
    updateFn(result.current);
  });

  return validateUpdate(result.current);
}

/**
 * Common assertions for array-based context state
 */
export const contextAssertions = {
  /**
   * Assert array contains expected items
   */
  arrayContains: <T,>(arr: T[], expectedItems: T[]) => {
    expectedItems.forEach(item => {
      expect(arr).toContain(item);
    });
  },

  /**
   * Assert array has unique items only
   */
  arrayIsUnique: <T,>(arr: T[]) => {
    const unique = [...new Set(arr)];
    expect(arr).toEqual(unique);
  },

  /**
   * Assert array length is within bounds
   */
  arrayLengthWithinBounds: <T,>(arr: T[], max: number) => {
    expect(arr.length).toBeLessThanOrEqual(max);
  },
};
