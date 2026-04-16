import {
  createContext,
  useContext,
  useMemo,
  useReducer,
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
  setLoadingBookmark: (id: string, loading: boolean) => void;
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
  | { type: "SET_LOADING_BOOKMARK"; id: string; loading: boolean }
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
    case "SET_LOADING_BOOKMARK": {
      const next = new Set(state.loadingBookmarks);
      if (action.loading) next.add(action.id);
      else next.delete(action.id);
      return { ...state, loadingBookmarks: next };
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

  // Derived sets for O(1) lookup
  const savedSet = useMemo(() => new Set(state.saved), [state.saved]);
  const bookmarkSet = useMemo(
    () => new Set(state.guideBookmarks),
    [state.guideBookmarks]
  );

  const actions = useMemo<SavedActions>(
    () => ({
      toggleSave: (id: string) => {
        dispatch({ type: "TOGGLE_SAVE", id });
      },
      isSaved: (id: string) => savedSet.has(id),
      toggleGuideBookmark: (id: string) => {
        dispatch({ type: "TOGGLE_GUIDE_BOOKMARK", id });
      },
      isGuideBookmarked: (id: string) => bookmarkSet.has(id),
      setLoadingBookmark: (id: string, loading: boolean) => {
        dispatch({ type: "SET_LOADING_BOOKMARK", id, loading });
      },
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
