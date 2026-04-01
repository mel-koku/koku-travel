"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SIGN_IN_PROMPTS_STORAGE_KEY } from "@/lib/constants/storage";
import { PROMPT_COOLDOWN_DAYS, SAVES_THRESHOLD } from "@/lib/constants/signInPrompts";

type PromptState = {
  dismissedPrompts: Record<string, number>; // promptId -> timestamp
  sessionPromptsFired: Set<string>;
  visitCount: number;
  firstVisitAt: number;
};

type PromptId =
  | "post-generation"
  | "saves-threshold"
  | "return-visit"
  | "stale-data";

function loadPromptState(): Omit<PromptState, "sessionPromptsFired"> {
  if (typeof window === "undefined") {
    return { dismissedPrompts: {}, visitCount: 0, firstVisitAt: Date.now() };
  }
  try {
    const raw = localStorage.getItem(SIGN_IN_PROMPTS_STORAGE_KEY);
    if (!raw) return { dismissedPrompts: {}, visitCount: 1, firstVisitAt: Date.now() };
    const parsed = JSON.parse(raw);
    return {
      dismissedPrompts: parsed.dismissedPrompts ?? {},
      visitCount: (parsed.visitCount ?? 0) + 1,
      firstVisitAt: parsed.firstVisitAt ?? Date.now(),
    };
  } catch {
    return { dismissedPrompts: {}, visitCount: 1, firstVisitAt: Date.now() };
  }
}

function savePromptState(state: Omit<PromptState, "sessionPromptsFired">) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      SIGN_IN_PROMPTS_STORAGE_KEY,
      JSON.stringify({
        dismissedPrompts: state.dismissedPrompts,
        visitCount: state.visitCount,
        firstVisitAt: state.firstVisitAt,
      }),
    );
  } catch {
    // Storage full or unavailable
  }
}

export function useSignInPrompts(isAuthenticated: boolean) {
  const [state, setState] = useState<PromptState>(() => {
    const persisted = loadPromptState();
    return { ...persisted, sessionPromptsFired: new Set() };
  });

  // Persist on change (exclude session-only fields)
  useEffect(() => {
    savePromptState({
      dismissedPrompts: state.dismissedPrompts,
      visitCount: state.visitCount,
      firstVisitAt: state.firstVisitAt,
    });
  }, [state.dismissedPrompts, state.visitCount, state.firstVisitAt]);

  const isOnCooldown = useCallback(
    (promptId: PromptId): boolean => {
      const dismissedAt = state.dismissedPrompts[promptId];
      if (!dismissedAt) return false;
      const cooldownMs = PROMPT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      return Date.now() - dismissedAt < cooldownMs;
    },
    [state.dismissedPrompts],
  );

  const hasFiredInSession = useCallback(
    (promptId: PromptId): boolean => state.sessionPromptsFired.has(promptId),
    [state.sessionPromptsFired],
  );

  const canShow = useCallback(
    (promptId: PromptId): boolean => {
      if (isAuthenticated) return false;
      if (isOnCooldown(promptId)) return false;
      if (hasFiredInSession(promptId)) return false;
      return true;
    },
    [isAuthenticated, isOnCooldown, hasFiredInSession],
  );

  const dismiss = useCallback((promptId: PromptId) => {
    setState((s) => ({
      ...s,
      dismissedPrompts: { ...s.dismissedPrompts, [promptId]: Date.now() },
      sessionPromptsFired: new Set([...s.sessionPromptsFired, promptId]),
    }));
  }, []);

  const markFired = useCallback((promptId: PromptId) => {
    setState((s) => ({
      ...s,
      sessionPromptsFired: new Set([...s.sessionPromptsFired, promptId]),
    }));
  }, []);

  const shouldShowReturnVisit = useMemo(
    () => canShow("return-visit") && state.visitCount >= 2,
    [canShow, state.visitCount],
  );

  const shouldShowSavesThreshold = useCallback(
    (savedCount: number) => canShow("saves-threshold") && savedCount >= SAVES_THRESHOLD,
    [canShow],
  );

  const shouldShowPostGeneration = useMemo(
    () => canShow("post-generation"),
    [canShow],
  );

  return {
    canShow,
    dismiss,
    markFired,
    shouldShowReturnVisit,
    shouldShowSavesThreshold,
    shouldShowPostGeneration,
    visitCount: state.visitCount,
  };
}
