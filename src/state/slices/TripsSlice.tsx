import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { sliceRegistry } from "../sync/syncRegistry";
import {
  createTripRecord,
  updateTripItinerary as updateTripItineraryOp,
  renameTrip as renameTripOp,
  deleteTrip as deleteTripOp,
  restoreTrip as restoreTripOp,
  getTripById as getTripByIdOp,
  sanitizeTrips,
  type StoredTrip,
  type CreateTripInput,
} from "@/services/trip";
import type { Itinerary } from "@/types/itinerary";
import type { CityAccommodation, DayEntryPoint } from "@/types/trip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TripsState = {
  trips: StoredTrip[];
  dayEntryPoints: Record<string, DayEntryPoint>;
  cityAccommodations: Record<string, CityAccommodation>;
  /** Runtime-only: timestamps of local mutations. Not persisted. */
  localTripUpdatedAt: Record<string, number>;
  /** Runtime-only: loading state during remote refresh. Not persisted. */
  isLoadingRefresh: boolean;
};

export type TripsActions = {
  createTrip: (input: CreateTripInput) => string;
  updateTripItinerary: (tripId: string, itinerary: Itinerary) => void;
  renameTrip: (tripId: string, name: string) => void;
  deleteTrip: (tripId: string) => void;
  restoreTrip: (trip: StoredTrip) => void;
  getTripById: (tripId: string) => StoredTrip | undefined;
  setDayEntryPoint: (
    tripId: string,
    dayId: string,
    type: "start" | "end",
    ep?: DayEntryPoint["startPoint"],
  ) => void;
  setCityAccommodation: (
    tripId: string,
    cityId: string,
    accommodation?: CityAccommodation,
  ) => void;
  setIsLoadingRefresh: (v: boolean) => void;
  reset: () => void;
  hydrate: (patch: Partial<TripsState>) => void;
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_STATE: TripsState = {
  trips: [],
  dayEntryPoints: {},
  cityAccommodations: {},
  localTripUpdatedAt: {},
  isLoadingRefresh: false,
};

// ---------------------------------------------------------------------------
// Slice registry (serialize omits runtime-only fields)
// ---------------------------------------------------------------------------

sliceRegistry.register<TripsState>({
  key: "trips",
  serialize: (state) => ({
    trips: state.trips,
    dayEntryPoints: state.dayEntryPoints,
    cityAccommodations: state.cityAccommodations,
  }),
  deserialize: (raw): TripsState => {
    if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
    const r = raw as Record<string, unknown>;

    const trips = sanitizeTrips(r.trips);

    const dayEntryPoints: Record<string, DayEntryPoint> =
      r.dayEntryPoints && typeof r.dayEntryPoints === "object"
        ? (r.dayEntryPoints as Record<string, DayEntryPoint>)
        : {};

    const cityAccommodations: Record<string, CityAccommodation> =
      r.cityAccommodations && typeof r.cityAccommodations === "object"
        ? (r.cityAccommodations as Record<string, CityAccommodation>)
        : {};

    return {
      trips,
      dayEntryPoints,
      cityAccommodations,
      localTripUpdatedAt: {},
      isLoadingRefresh: false,
    };
  },
});

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: "CREATE_TRIP"; trip: StoredTrip }
  | { type: "UPDATE_TRIP_ITINERARY"; tripId: string; itinerary: Itinerary }
  | { type: "RENAME_TRIP"; tripId: string; name: string }
  | { type: "DELETE_TRIP"; tripId: string }
  | { type: "RESTORE_TRIP"; trip: StoredTrip }
  | {
      type: "SET_DAY_ENTRY_POINT";
      key: string;
      field: "startPoint" | "endPoint";
      ep: DayEntryPoint["startPoint"] | undefined;
    }
  | {
      type: "SET_CITY_ACCOMMODATION";
      key: string;
      accommodation: CityAccommodation | undefined;
    }
  | { type: "SET_IS_LOADING_REFRESH"; v: boolean }
  | { type: "RESET" }
  | { type: "HYDRATE"; patch: Partial<TripsState> };

function stampAt(state: TripsState, tripId: string): TripsState["localTripUpdatedAt"] {
  return { ...state.localTripUpdatedAt, [tripId]: Date.now() };
}

function reducer(state: TripsState, action: Action): TripsState {
  switch (action.type) {
    case "CREATE_TRIP": {
      return {
        ...state,
        trips: [action.trip, ...state.trips],
        localTripUpdatedAt: stampAt(state, action.trip.id),
      };
    }
    case "UPDATE_TRIP_ITINERARY": {
      const next = updateTripItineraryOp(state.trips, action.tripId, action.itinerary);
      if (!next) return state;
      return {
        ...state,
        trips: next,
        localTripUpdatedAt: stampAt(state, action.tripId),
      };
    }
    case "RENAME_TRIP": {
      const next = renameTripOp(state.trips, action.tripId, action.name);
      if (!next) return state;
      return {
        ...state,
        trips: next,
        localTripUpdatedAt: stampAt(state, action.tripId),
      };
    }
    case "DELETE_TRIP": {
      const next = deleteTripOp(state.trips, action.tripId);
      if (!next) return state;
      return {
        ...state,
        trips: next,
        localTripUpdatedAt: stampAt(state, action.tripId),
      };
    }
    case "RESTORE_TRIP": {
      const next = restoreTripOp(state.trips, action.trip);
      if (!next) return state;
      return {
        ...state,
        trips: next,
        localTripUpdatedAt: stampAt(state, action.trip.id),
      };
    }
    case "SET_DAY_ENTRY_POINT": {
      const existing = state.dayEntryPoints[action.key] ?? {};
      const updated: DayEntryPoint = { ...existing, [action.field]: action.ep };
      return {
        ...state,
        dayEntryPoints: { ...state.dayEntryPoints, [action.key]: updated },
      };
    }
    case "SET_CITY_ACCOMMODATION": {
      if (action.accommodation === undefined) {
        const { [action.key]: _removed, ...rest } = state.cityAccommodations;
        return { ...state, cityAccommodations: rest };
      }
      return {
        ...state,
        cityAccommodations: {
          ...state.cityAccommodations,
          [action.key]: action.accommodation,
        },
      };
    }
    case "SET_IS_LOADING_REFRESH":
      return { ...state, isLoadingRefresh: action.v };
    case "RESET":
      return { ...DEFAULT_STATE };
    case "HYDRATE": {
      const patch = action.patch;
      return {
        ...state,
        ...(patch.trips !== undefined && { trips: patch.trips }),
        ...(patch.dayEntryPoints !== undefined && { dayEntryPoints: patch.dayEntryPoints }),
        ...(patch.cityAccommodations !== undefined && { cityAccommodations: patch.cityAccommodations }),
        ...(patch.localTripUpdatedAt !== undefined && { localTripUpdatedAt: patch.localTripUpdatedAt }),
        ...(patch.isLoadingRefresh !== undefined && { isLoadingRefresh: patch.isLoadingRefresh }),
      };
    }
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type TripsContextValue = {
  state: TripsState;
  actions: TripsActions;
};

const TripsContext = createContext<TripsContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function TripsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);

  const actions = useMemo<TripsActions>(
    () => ({
      createTrip: (input: CreateTripInput): string => {
        const trip = createTripRecord(input);
        dispatch({ type: "CREATE_TRIP", trip });
        return trip.id;
      },
      updateTripItinerary: (tripId: string, itinerary: Itinerary) =>
        dispatch({ type: "UPDATE_TRIP_ITINERARY", tripId, itinerary }),
      renameTrip: (tripId: string, name: string) =>
        dispatch({ type: "RENAME_TRIP", tripId, name }),
      deleteTrip: (tripId: string) =>
        dispatch({ type: "DELETE_TRIP", tripId }),
      restoreTrip: (trip: StoredTrip) =>
        dispatch({ type: "RESTORE_TRIP", trip }),
      getTripById: (tripId: string): StoredTrip | undefined =>
        getTripByIdOp(state.trips, tripId),
      setDayEntryPoint: (
        tripId: string,
        dayId: string,
        type: "start" | "end",
        ep?: DayEntryPoint["startPoint"],
      ) => {
        const key = `${tripId}-${dayId}`;
        const field = type === "start" ? "startPoint" : "endPoint";
        dispatch({ type: "SET_DAY_ENTRY_POINT", key, field, ep });
      },
      setCityAccommodation: (
        tripId: string,
        cityId: string,
        accommodation?: CityAccommodation,
      ) => {
        const key = `${tripId}-${cityId}`;
        dispatch({ type: "SET_CITY_ACCOMMODATION", key, accommodation });
      },
      setIsLoadingRefresh: (v: boolean) =>
        dispatch({ type: "SET_IS_LOADING_REFRESH", v }),
      reset: () => dispatch({ type: "RESET" }),
      hydrate: (patch: Partial<TripsState>) =>
        dispatch({ type: "HYDRATE", patch }),
    }),
    // getTripById closes over state.trips intentionally; all other actions are dispatch-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.trips],
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTrips(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) {
    throw new Error("useTrips must be used within a TripsProvider");
  }
  return ctx;
}
