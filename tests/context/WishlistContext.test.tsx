import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { WishlistProvider, useWishlist } from "@/context/WishlistContext";
import { AppStateProvider } from "@/state/AppState";
import { createClient } from "@/lib/supabase/client";

// Mock dependencies
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/wishlistStorage", () => ({
  loadWishlist: vi.fn().mockReturnValue([]),
  WISHLIST_KEY: "koku_wishlist",
}));

import { createMockSupabaseClient } from "../utils/mocks";

describe("WishlistContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
  });

  describe("context provider initialization", () => {
    it("should initialize with empty wishlist", () => {
      const { result } = renderHook(() => useWishlist(), {
        wrapper: ({ children }) => (
          <AppStateProvider>
            <WishlistProvider>{children}</WishlistProvider>
          </AppStateProvider>
        ),
      });

      expect(result.current.wishlist).toEqual([]);
      expect(result.current.isInWishlist("place-1")).toBe(false);
    });
  });

  describe("context value updates", () => {
    it("should toggle wishlist items", () => {
      const { result } = renderHook(() => useWishlist(), {
        wrapper: ({ children }) => (
          <AppStateProvider>
            <WishlistProvider>{children}</WishlistProvider>
          </AppStateProvider>
        ),
      });

      expect(result.current.isInWishlist("place-1")).toBe(false);

      act(() => {
        result.current.toggleWishlist("place-1");
      });

      expect(result.current.isInWishlist("place-1")).toBe(true);
      expect(result.current.wishlist).toContain("place-1");

      act(() => {
        result.current.toggleWishlist("place-1");
      });

      expect(result.current.isInWishlist("place-1")).toBe(false);
      expect(result.current.wishlist).not.toContain("place-1");
    });

    it("should add multiple items to wishlist", () => {
      const { result } = renderHook(() => useWishlist(), {
        wrapper: ({ children }) => (
          <AppStateProvider>
            <WishlistProvider>{children}</WishlistProvider>
          </AppStateProvider>
        ),
      });

      act(() => {
        result.current.toggleWishlist("place-1");
        result.current.toggleWishlist("place-2");
        result.current.toggleWishlist("place-3");
      });

      expect(result.current.wishlist).toHaveLength(3);
      expect(result.current.isInWishlist("place-1")).toBe(true);
      expect(result.current.isInWishlist("place-2")).toBe(true);
      expect(result.current.isInWishlist("place-3")).toBe(true);
    });
  });

  describe("context consumption", () => {
    it("should provide wishlist context values", () => {
      const { result } = renderHook(() => useWishlist(), {
        wrapper: ({ children }) => (
          <AppStateProvider>
            <WishlistProvider>{children}</WishlistProvider>
          </AppStateProvider>
        ),
      });

      expect(result.current).toHaveProperty("wishlist");
      expect(result.current).toHaveProperty("toggleWishlist");
      expect(result.current).toHaveProperty("isInWishlist");
      expect(typeof result.current.toggleWishlist).toBe("function");
      expect(typeof result.current.isInWishlist).toBe("function");
    });
  });

  describe("integration with AppState", () => {
    it("should sync with AppState favorites", () => {
      const { result: wishlistResult } = renderHook(() => useWishlist(), {
        wrapper: ({ children }) => (
          <AppStateProvider>
            <WishlistProvider>{children}</WishlistProvider>
          </AppStateProvider>
        ),
      });

      act(() => {
        wishlistResult.current.toggleWishlist("place-1");
      });

      // Wishlist should reflect the favorite
      expect(wishlistResult.current.isInWishlist("place-1")).toBe(true);
    });
  });
});

