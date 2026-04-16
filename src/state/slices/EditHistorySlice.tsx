import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { sliceRegistry } from "../sync/syncRegistry";
import type { ItineraryEdit } from "@/types/itinerary";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EditHistorySliceState = {
  editHistory: Record<string, ItineraryEdit[]>;
  currentHistoryIndex: Record<string, number>;
};

export type EditHistorySliceActions = {
  setHistoryAndIndex: (
    tripId: string,
    edits: ItineraryEdit[],
    index: number
  ) => void;
  pruneForTrip: (tripId: string) => void;
  getHistoryForTrip: (tripId: string) => ItineraryEdit[];
  getIndexForTrip: (tripId: string) => number;
  hydrate: (patch: Partial<EditHistorySliceState>) => void;
  reset: () => void;
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_STATE: EditHistorySliceState = {
  editHistory: {},
  currentHistoryIndex: {},
};

// ---------------------------------------------------------------------------
// Slice registry
// ---------------------------------------------------------------------------

sliceRegistry.register<EditHistorySliceState>({
  key: "editHistory",
  serialize: (state) => ({
    editHistory: state.editHistory,
    currentHistoryIndex: state.currentHistoryIndex,
  }),
  deserialize: (raw): EditHistorySliceState => {
    if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
    const r = raw as Record<string, unknown>;
    const editHistory =
      r.editHistory && typeof r.editHistory === "object" && !Array.isArray(r.editHistory)
        ? (r.editHistory as Record<string, ItineraryEdit[]>)
        : {};
    const currentHistoryIndex =
      r.currentHistoryIndex &&
      typeof r.currentHistoryIndex === "object" &&
      !Array.isArray(r.currentHistoryIndex)
        ? (r.currentHistoryIndex as Record<string, number>)
        : {};
    return { editHistory, currentHistoryIndex };
  },
});

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | {
      type: "SET_HISTORY_AND_INDEX";
      tripId: string;
      edits: ItineraryEdit[];
      index: number;
    }
  | { type: "PRUNE_FOR_TRIP"; tripId: string }
  | { type: "HYDRATE"; patch: Partial<EditHistorySliceState> }
  | { type: "RESET" };

function reducer(
  state: EditHistorySliceState,
  action: Action
): EditHistorySliceState {
  switch (action.type) {
    case "SET_HISTORY_AND_INDEX": {
      return {
        ...state,
        editHistory: {
          ...state.editHistory,
          [action.tripId]: action.edits,
        },
        currentHistoryIndex: {
          ...state.currentHistoryIndex,
          [action.tripId]: action.index,
        },
      };
    }
    case "PRUNE_FOR_TRIP": {
      const { [action.tripId]: _h, ...restHistory } = state.editHistory;
      const { [action.tripId]: _i, ...restIndex } = state.currentHistoryIndex;
      return {
        editHistory: restHistory,
        currentHistoryIndex: restIndex,
      };
    }
    case "HYDRATE": {
      return {
        editHistory:
          action.patch.editHistory !== undefined
            ? action.patch.editHistory
            : state.editHistory,
        currentHistoryIndex:
          action.patch.currentHistoryIndex !== undefined
            ? action.patch.currentHistoryIndex
            : state.currentHistoryIndex,
      };
    }
    case "RESET":
      return { ...DEFAULT_STATE };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type EditHistoryContextValue = {
  state: EditHistorySliceState;
  actions: EditHistorySliceActions;
};

const EditHistoryContext = createContext<EditHistoryContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function EditHistoryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);

  const actions = useMemo<EditHistorySliceActions>(
    () => ({
      setHistoryAndIndex: (tripId, edits, index) =>
        dispatch({ type: "SET_HISTORY_AND_INDEX", tripId, edits, index }),
      pruneForTrip: (tripId) =>
        dispatch({ type: "PRUNE_FOR_TRIP", tripId }),
      getHistoryForTrip: (tripId) => state.editHistory[tripId] ?? [],
      getIndexForTrip: (tripId) => state.currentHistoryIndex[tripId] ?? -1,
      hydrate: (patch) => dispatch({ type: "HYDRATE", patch }),
      reset: () => dispatch({ type: "RESET" }),
    }),
    // getHistoryForTrip / getIndexForTrip depend on state — intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  );

  const value = useMemo(
    () => ({ state, actions }),
    [state, actions]
  );

  return (
    <EditHistoryContext.Provider value={value}>
      {children}
    </EditHistoryContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEditHistorySlice(): EditHistoryContextValue {
  const ctx = useContext(EditHistoryContext);
  if (!ctx) {
    throw new Error(
      "useEditHistorySlice must be used within an EditHistoryProvider"
    );
  }
  return ctx;
}
