"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useMotionValue, useSpring } from "framer-motion";

export type CursorState = "default" | "link" | "view" | "drag" | "hidden";

type CursorContextValue = {
  cursorState: CursorState;
  setCursorState: (state: CursorState) => void;
  cursorX: ReturnType<typeof useMotionValue<number>>;
  cursorY: ReturnType<typeof useMotionValue<number>>;
  smoothX: ReturnType<typeof useSpring>;
  smoothY: ReturnType<typeof useSpring>;
  isEnabled: boolean;
};

const CursorContext = createContext<CursorContextValue | null>(null);

export function CursorProvider({ children }: { children: ReactNode }) {
  const [cursorState, setCursorState] = useState<CursorState>("default");
  const [isEnabled, setIsEnabled] = useState(false);
  const rafRef = useRef<number>(0);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const smoothX = useSpring(cursorX, { stiffness: 10000, damping: 500, mass: 0.1 });
  const smoothY = useSpring(cursorY, { stiffness: 10000, damping: 500, mass: 0.1 });

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
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        cursorX.set(e.clientX);
        cursorY.set(e.clientY);
      });
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafRef.current);
      document.documentElement.classList.remove("custom-cursor");
    };
  }, [cursorX, cursorY]);

  const setCursorStateCb = useCallback((state: CursorState) => {
    setCursorState(state);
  }, []);

  return (
    <CursorContext.Provider
      value={{
        cursorState,
        setCursorState: setCursorStateCb,
        cursorX,
        cursorY,
        smoothX,
        smoothY,
        isEnabled,
      }}
    >
      {children}
    </CursorContext.Provider>
  );
}

export function useCursor(): CursorContextValue {
  const ctx = useContext(CursorContext);
  if (!ctx) {
    // Return a stub — CustomCursor checks isEnabled and bails early
    return {
      cursorState: "default",
      setCursorState: () => {},
      isEnabled: false,
    } as unknown as CursorContextValue;
  }
  return ctx;
}
