"use client";

import { createContext, useContext, useMemo } from "react";
import { useAppState } from "@/state/AppState";

type WishlistContextType = {
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
};

const WishlistContext = createContext<WishlistContextType>({
  wishlist: [],
  toggleWishlist: () => {
    if (process.env.NODE_ENV !== "production") throw new Error("useWishlist must be used within WishlistProvider");
  },
  isInWishlist: () => {
    if (process.env.NODE_ENV !== "production") throw new Error("useWishlist must be used within WishlistProvider");
    return false;
  },
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { favorites, toggleFavorite, isFavorite } = useAppState();

  const value = useMemo<WishlistContextType>(
    () => ({
      wishlist: favorites,
      toggleWishlist: toggleFavorite,
      isInWishlist: isFavorite,
    }),
    [favorites, toggleFavorite, isFavorite],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);

