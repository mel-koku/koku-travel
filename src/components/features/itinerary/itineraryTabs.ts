import type { UnlockPromptContext } from "./ContextualUnlockPrompt";

export type ItineraryViewMode = "timeline" | "dashboard" | "discover" | "culture";

export type ItineraryTab = {
  key: ItineraryViewMode;
  label: string;
  locked: boolean;
  lockContext?: UnlockPromptContext;
};

type BuildTabsArgs = {
  isTripLocked: boolean;
  isReadOnly: boolean;
  isUsingMock: boolean;
  hasCulturalBriefing: boolean;
};

/**
 * Build the ordered tab list for the itinerary shell.
 *
 * Lock rule: tabs are only marked locked when the trip is locked AND the trip
 * is not a mock fixture. Mock trips have no billing context, so they behave as
 * if unlocked (mirrors the existing Book/Share render guard).
 *
 * Read-only shared views omit "Near Me" (geolocation has no meaning in a
 * frozen snapshot).
 */
export function buildItineraryTabs(args: BuildTabsArgs): ItineraryTab[] {
  const { isTripLocked, isReadOnly, isUsingMock, hasCulturalBriefing } = args;
  const tabLocked = isTripLocked && !isUsingMock;

  const tabs: ItineraryTab[] = [
    { key: "timeline", label: "Timeline", locked: false },
    {
      key: "dashboard",
      label: "Overview",
      locked: tabLocked,
      lockContext: tabLocked ? "overview" : undefined,
    },
  ];

  if (!isReadOnly) {
    tabs.push({
      key: "discover",
      label: "Near Me",
      locked: tabLocked,
      lockContext: tabLocked ? "near_me" : undefined,
    });
  }

  if (hasCulturalBriefing) {
    tabs.push({ key: "culture", label: "Before You Land", locked: false });
  }

  return tabs;
}

export type TabClickDecision =
  | { action: "unlock"; context: UnlockPromptContext }
  | { action: "switch"; key: ItineraryViewMode };

/**
 * Resolve what should happen when a tab is clicked.
 *
 * If the tab is locked and carries a lockContext, return an "unlock" decision
 * so the caller can open the ContextualUnlockPrompt. Otherwise return a
 * "switch" decision. A locked tab without a lockContext falls through to
 * switch -- this is defensive; the builder always pairs them.
 */
export function resolveTabClick(tab: ItineraryTab): TabClickDecision {
  if (tab.locked && tab.lockContext) {
    return { action: "unlock", context: tab.lockContext };
  }
  return { action: "switch", key: tab.key };
}
