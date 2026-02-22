"use client";

import { createContext, useContext, useMemo } from "react";
import { useAppState } from "@/state/AppState";

type SavedContextType = {
  saved: string[];
  toggleSave: (id: string) => void;
  isInSaved: (id: string) => boolean;
};

const SavedContext = createContext<SavedContextType>({
  saved: [],
  toggleSave: () => {
    if (process.env.NODE_ENV !== "production") throw new Error("useSaved must be used within SavedProvider");
  },
  isInSaved: () => {
    if (process.env.NODE_ENV !== "production") throw new Error("useSaved must be used within SavedProvider");
    return false;
  },
});

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const { saved, toggleSave, isSaved } = useAppState();

  const value = useMemo<SavedContextType>(
    () => ({
      saved,
      toggleSave,
      isInSaved: isSaved,
    }),
    [saved, toggleSave, isSaved],
  );

  return (
    <SavedContext.Provider value={value}>
      {children}
    </SavedContext.Provider>
  );
}

export const useSaved = () => useContext(SavedContext);
