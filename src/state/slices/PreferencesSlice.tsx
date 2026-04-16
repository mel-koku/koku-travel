import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { sliceRegistry } from "../sync/syncRegistry";
import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "@/types/userPreferences";
import { STABLE_DEFAULT_USER_ID } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserProfile = {
  id: string;
  displayName: string;
  email?: string;
};

export type PreferencesState = {
  user: UserProfile;
  userPreferences: UserPreferences;
};

export type PreferencesActions = {
  setUser: (patch: Partial<UserProfile>) => void;
  setUserPreferences: (patch: Partial<UserPreferences>) => void;
  reset: () => void;
  hydrate: (patch: Partial<PreferencesState>) => void;
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_USER: UserProfile = {
  id: STABLE_DEFAULT_USER_ID,
  displayName: "Guest",
};

const DEFAULT_STATE: PreferencesState = {
  user: DEFAULT_USER,
  userPreferences: DEFAULT_USER_PREFERENCES,
};

// ---------------------------------------------------------------------------
// Slice registry
// ---------------------------------------------------------------------------

sliceRegistry.register<PreferencesState>({
  key: "preferences",
  serialize: (state) => ({
    user: state.user,
    userPreferences: state.userPreferences,
  }),
  deserialize: (raw): PreferencesState => {
    if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
    const r = raw as Record<string, unknown>;

    let user: UserProfile = { ...DEFAULT_USER };
    if (r.user && typeof r.user === "object") {
      const u = r.user as Record<string, unknown>;
      user = {
        id: typeof u.id === "string" ? u.id : DEFAULT_USER.id,
        displayName:
          typeof u.displayName === "string"
            ? u.displayName
            : DEFAULT_USER.displayName,
        ...(typeof u.email === "string" && { email: u.email }),
      };
    }

    let userPreferences: UserPreferences = { ...DEFAULT_USER_PREFERENCES };
    if (r.userPreferences && typeof r.userPreferences === "object") {
      const p = r.userPreferences as Record<string, unknown>;
      userPreferences = {
        dietaryRestrictions: Array.isArray(p.dietaryRestrictions)
          ? p.dietaryRestrictions.filter((v): v is string => typeof v === "string")
          : [],
        accessibilityNeeds:
          p.accessibilityNeeds && typeof p.accessibilityNeeds === "object"
            ? (p.accessibilityNeeds as UserPreferences["accessibilityNeeds"])
            : {},
        defaultGroupType:
          typeof p.defaultGroupType === "string"
            ? (p.defaultGroupType as UserPreferences["defaultGroupType"])
            : undefined,
        defaultPace:
          typeof p.defaultPace === "string"
            ? (p.defaultPace as UserPreferences["defaultPace"])
            : undefined,
        accommodationStyle: Array.isArray(p.accommodationStyle)
          ? p.accommodationStyle.filter((v): v is string => typeof v === "string")
          : [],
        defaultVibes: Array.isArray(p.defaultVibes)
          ? p.defaultVibes.filter((v): v is string => typeof v === "string") as UserPreferences["defaultVibes"]
          : [],
        learnedVibes:
          p.learnedVibes && typeof p.learnedVibes === "object"
            ? (p.learnedVibes as Record<string, number>)
            : {},
      };
    }

    return { user, userPreferences };
  },
});

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: "SET_USER"; patch: Partial<UserProfile> }
  | { type: "SET_USER_PREFERENCES"; patch: Partial<UserPreferences> }
  | { type: "RESET" }
  | { type: "HYDRATE"; patch: Partial<PreferencesState> };

function reducer(state: PreferencesState, action: Action): PreferencesState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: { ...state.user, ...action.patch } };
    case "SET_USER_PREFERENCES":
      return {
        ...state,
        userPreferences: { ...state.userPreferences, ...action.patch },
      };
    case "RESET":
      return { ...DEFAULT_STATE };
    case "HYDRATE":
      return {
        ...state,
        ...(action.patch.user !== undefined && { user: action.patch.user }),
        ...(action.patch.userPreferences !== undefined && {
          userPreferences: action.patch.userPreferences,
        }),
      };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type PreferencesContextValue = {
  state: PreferencesState;
  actions: PreferencesActions;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);

  const actions = useMemo<PreferencesActions>(
    () => ({
      setUser: (patch: Partial<UserProfile>) =>
        dispatch({ type: "SET_USER", patch }),
      setUserPreferences: (patch: Partial<UserPreferences>) =>
        dispatch({ type: "SET_USER_PREFERENCES", patch }),
      reset: () => dispatch({ type: "RESET" }),
      hydrate: (patch: Partial<PreferencesState>) =>
        dispatch({ type: "HYDRATE", patch }),
    }),
    []
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return ctx;
}
