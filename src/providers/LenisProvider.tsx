"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import Lenis from "lenis";

type LenisContextValue = {
  lenis: Lenis | null;
  scrollProgress: number;
  direction: number;
  pause: () => void;
  resume: () => void;
};

const LenisContext = createContext<LenisContextValue>({
  lenis: null,
  scrollProgress: 0,
  direction: 1,
  pause: () => {},
  resume: () => {},
});

export function LenisProvider({ children }: { children: ReactNode }) {
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [direction, setDirection] = useState(1);
  const rafRef = useRef<number>(0);

  const pause = useCallback(() => {
    lenisInstance?.stop();
    document.documentElement.classList.add("lenis-stopped");
  }, [lenisInstance]);

  const resume = useCallback(() => {
    lenisInstance?.start();
    document.documentElement.classList.remove("lenis-stopped");
  }, [lenisInstance]);

  useEffect(() => {
    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const lenis = new Lenis({
      duration: prefersReducedMotion ? 0 : 0.6,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.5,
    });

    setLenisInstance(lenis);
    document.documentElement.classList.add("lenis");

    lenis.on("scroll", ({ progress, direction: dir }: { progress: number; direction: number }) => {
      setScrollProgress(progress);
      setDirection(dir);
    });

    function raf(time: number) {
      lenis.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    }

    rafRef.current = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafRef.current);
      lenis.destroy();
      setLenisInstance(null);
      document.documentElement.classList.remove("lenis");
    };
  }, []);

  const value = useMemo(
    () => ({ lenis: lenisInstance, scrollProgress, direction, pause, resume }),
    [lenisInstance, scrollProgress, direction, pause, resume]
  );

  return (
    <LenisContext.Provider value={value}>
      {children}
    </LenisContext.Provider>
  );
}

export function useLenis() {
  return useContext(LenisContext);
}
