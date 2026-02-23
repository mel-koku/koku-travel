"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useMotionValue } from "framer-motion";

export type CursorState = "default" | "link";

type CursorContextValue = {
  cursorState: CursorState;
  cursorX: ReturnType<typeof useMotionValue<number>>;
  cursorY: ReturnType<typeof useMotionValue<number>>;
  isEnabled: boolean;
};

const CursorContext = createContext<CursorContextValue | null>(null);

const INTERACTIVE_SELECTOR = "a, button, [role='button'], input, select, textarea, label, summary";

function isInteractive(el: Element | null): boolean {
  if (!el) return false;
  return el.closest(INTERACTIVE_SELECTOR) !== null;
}

export function CursorProvider({ children }: { children: ReactNode }) {
  const [cursorState, setCursorState] = useState<CursorState>("default");
  const [isEnabled, setIsEnabled] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const currentStateRef = useRef<CursorState>("default");

  useEffect(() => {
    const isPointerFine = window.matchMedia("(pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const enabled = isPointerFine && !prefersReducedMotion;
    setIsEnabled(enabled);

    if (!enabled) return;

    document.documentElement.classList.add("custom-cursor");

    const onMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      const target = e.target as Element | null;
      const nextState: CursorState = isInteractive(target) ? "link" : "default";

      if (nextState !== currentStateRef.current) {
        currentStateRef.current = nextState;
        setCursorState(nextState);
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.documentElement.classList.remove("custom-cursor");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- cursorX/cursorY are stable refs from useMotionValue
  }, []);

  const value = useMemo(
    () => ({
      cursorState,
      cursorX,
      cursorY,
      isEnabled,
    }),
    // cursorX/cursorY are stable refs from useMotionValue
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cursorState, isEnabled]
  );

  return (
    <CursorContext.Provider value={value}>
      {children}
    </CursorContext.Provider>
  );
}

export function useCursor() {
  const ctx = useContext(CursorContext);
  if (!ctx) {
    return {
      cursorState: "default" as CursorState,
      isEnabled: false,
    } as unknown as CursorContextValue;
  }
  return ctx;
}
