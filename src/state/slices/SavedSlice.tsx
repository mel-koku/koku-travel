import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { sliceRegistry } from "../sync/syncRegistry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SavedState = {
  saved: string[];
  guideBookmarks: string[];
  loadingBookmarks: Set<string>;
};

export type SavedActions = {
  toggleSave: (id: string) => void;
  isSaved: (id: string) => boolean;
  toggleGuideBookmark: (id: string) => void;
  isGuideBookmarked: (id: string) => boolean;
  reset: () => void;
  hydrate: (patch: Partial<SavedState>) => void;
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_STATE: SavedState = {
  saved: [],
  guideBookmarks: [],
  loadingBookmarks: new Set(),
};

// ---------------------------------------------------------------------------
// Slice registry (serializer — loadingBookmarks is never persisted)
// ---------------------------------------------------------------------------

sliceRegistry.register<SavedState>({
  key: "saved",
  serialize: (state) => ({
    saved: state.saved,
    guideBookmarks: state.guideBookmarks,
  }),
  deserialize: (raw): SavedState => {
    if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE, loadingBookmarks: new Set() };
    const r = raw as Record<string, unknown>;
    const saved = Array.isArray(r.saved)
      ? r.saved.filter((v): v is string => typeof v === "string")
      : [];
    const guideBookmarks = Array.isArray(r.guideBookmarks)
      ? r.guideBookmarks.filter((v): v is string => typeof v === "string")
      : [];
    return { saved, guideBookmarks, loadingBookmarks: new Set() };
  },
});

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: "TOGGLE_SAVE"; id: string }
  | { type: "TOGGLE_GUIDE_BOOKMARK"; id: string }
  | { type: "RESET" }
  | { type: "HYDRATE"; patch: Partial<SavedState> };

function reducer(state: SavedState, action: Action): SavedState {
  switch (action.type) {
    case "TOGGLE_SAVE": {
      const exists = state.saved.includes(action.id);
      return {
        ...state,
        saved: exists
          ? state.saved.filter((id) => id !== action.id)
          : [...state.saved, action.id],
      };
    }
    case "TOGGLE_GUIDE_BOOKMARK": {
      const exists = state.guideBookmarks.includes(action.id);
      return {
        ...state,
        guideBookmarks: exists
          ? state.guideBookmarks.filter((id) => id !== action.id)
          : [...state.guideBookmarks, action.id],
      };
    }
    case "RESET":
      return { ...DEFAULT_STATE, loadingBookmarks: new Set() };
    case "HYDRATE":
      return {
        ...state,
        ...(action.patch.saved !== undefined && { saved: action.patch.saved }),
        ...(action.patch.guideBookmarks !== undefined && {
          guideBookmarks: action.patch.guideBookmarks,
        }),
      };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type SavedContextValue = {
  state: SavedState;
  actions: SavedActions;
};

const SavedContext = createContext<SavedContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SavedProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);

  // Internal ref for guarding against Supabase refresh overwrites
  const pendingSavesRef = useRef<Map<string, "add" | "remove">>(new Map());

  // Derived sets for O(1) lookup
  const savedSet = useMemo(() => new Set(state.saved), [state.saved]);
  const bookmarkSet = useMemo(
    () => new Set(state.guideBookmarks),
    [state.guideBookmarks]
  );

  const actions = useMemo<SavedActions>(
    () => ({
      toggleSave: (id: string) => {
        const isCurrentlySaved = savedSet.has(id);
        pendingSavesRef.current.set(id, isCurrentlySaved ? "remove" : "add");
        dispatch({ type: "TOGGLE_SAVE", id });
      },
      isSaved: (id: string) => savedSet.has(id),
      toggleGuideBookmark: (id: string) => {
        dispatch({ type: "TOGGLE_GUIDE_BOOKMARK", id });
      },
      isGuideBookmarked: (id: string) => bookmarkSet.has(id),
      reset: () => dispatch({ type: "RESET" }),
      hydrate: (patch: Partial<SavedState>) =>
        dispatch({ type: "HYDRATE", patch }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedSet, bookmarkSet]
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <SavedContext.Provider value={value}>{children}</SavedContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSaved(): SavedContextValue {
  const ctx = useContext(SavedContext);
  if (!ctx) {
    throw new Error("useSaved must be used within a SavedProvider");
  }
  return ctx;
}
