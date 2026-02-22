import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { SavedProvider, useSaved } from "@/context/SavedContext";
import { AppStateProvider } from "@/state/AppState";
import { createClient } from "@/lib/supabase/client";

// Mock dependencies
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/savedStorage", () => ({
  loadSaved: vi.fn().mockReturnValue([]),
  SAVED_KEY: "koku_saved",
}));

import { createMockSupabaseClient } from "../utils/mocks";
import type { MockSupabaseClient } from "../utils/mocks";

type SupabaseBrowserClient = ReturnType<typeof createClient>;
const toBrowserClient = (client: MockSupabaseClient): SupabaseBrowserClient =>
  client as unknown as SupabaseBrowserClient;

describe("SavedContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockReturnValue(toBrowserClient(mockSupabase));
  });

  describe("context provider initialization", () => {
    it("should initialize with empty saved list", async () => {
      const { result } = renderHook(() => useSaved(), {
        wrapper: ({ children }) => (
          <AppStateProvider>
            <SavedProvider>{children}</SavedProvider>
          </AppStateProvider>
        ),
      });

      // Wait for mount effects to complete
      await waitFor(() => {
        expect(result.current.saved).toBeDefined();
      });

      expect(result.current.saved).toEqual([]);
      expect(result.current.isInSaved("place-1")).toBe(false);
    });
  });

  describe("context value updates", () => {
    it("should toggle saved items", async () => {
      const { result } = renderHook(() => useSaved(), {
        wrapper: ({ children }) => (
          <AppStateProvider>
            <SavedProvider>{children}</SavedProvider>
          </AppStateProvider>
        ),
      });

      // Wait for mount effects to complete
      await waitFor(() => {
        expect(result.current.saved).toBeDefined();
      });

      expect(result.current.isInSaved("place-1")).toBe(false);

      act(() => {
        result.current.toggleSave("place-1");
      });

      expect(result.current.isInSaved("place-1")).toBe(true);
      expect(result.current.saved).toContain("place-1");

      act(() => {
        result.current.toggleSave("place-1");
      });

      expect(result.current.isInSaved("place-1")).toBe(false);
      expect(result.current.saved).not.toContain("place-1");
    });

    it("should add multiple items to saved", async () => {
      const { result } = renderHook(() => useSaved(), {
        wrapper: ({ children }) => (
          <AppStateProvider>
            <SavedProvider>{children}</SavedProvider>
          </AppStateProvider>
        ),
      });

      // Wait for mount effects to complete
      await waitFor(() => {
        expect(result.current.saved).toBeDefined();
      });

      act(() => {
        result.current.toggleSave("place-1");
        result.current.toggleSave("place-2");
        result.current.toggleSave("place-3");
      });

      expect(result.current.saved).toHaveLength(3);
      expect(result.current.isInSaved("place-1")).toBe(true);
      expect(result.current.isInSaved("place-2")).toBe(true);
      expect(result.current.isInSaved("place-3")).toBe(true);
    });
  });

  describe("context consumption", () => {
    it("should provide saved context values", async () => {
      const { result } = renderHook(() => useSaved(), {
        wrapper: ({ children }) => (
          <AppStateProvider>
            <SavedProvider>{children}</SavedProvider>
          </AppStateProvider>
        ),
      });

      // Wait for mount effects to complete
      await waitFor(() => {
        expect(result.current.saved).toBeDefined();
      });

      expect(result.current).toHaveProperty("saved");
      expect(result.current).toHaveProperty("toggleSave");
      expect(result.current).toHaveProperty("isInSaved");
      expect(typeof result.current.toggleSave).toBe("function");
      expect(typeof result.current.isInSaved).toBe("function");
    });
  });

  describe("integration with AppState", () => {
    it("should sync with AppState saved", async () => {
      const { result: savedResult } = renderHook(() => useSaved(), {
        wrapper: ({ children }) => (
          <AppStateProvider>
            <SavedProvider>{children}</SavedProvider>
          </AppStateProvider>
        ),
      });

      // Wait for mount effects to complete
      await waitFor(() => {
        expect(savedResult.current.saved).toBeDefined();
      });

      act(() => {
        savedResult.current.toggleSave("place-1");
      });

      // Saved should reflect the item
      expect(savedResult.current.isInSaved("place-1")).toBe(true);
    });
  });
});
