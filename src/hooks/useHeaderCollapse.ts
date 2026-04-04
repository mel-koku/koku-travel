import { useEffect, useRef, useState } from "react";

export function useHeaderCollapse(viewMode: string) {
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const lastScrollTopRef = useRef(0);
  const headerCooldownRef = useRef(false);

  useEffect(() => {
    setHeaderCollapsed(false);
    lastScrollTopRef.current = 0;
    const el = document.querySelector("[data-itinerary-activities]")?.closest("[data-lenis-prevent]") ?? document.querySelector("[data-itinerary-activities]");
    if (!el) return;

    const THRESHOLD = 30;
    const COOLDOWN_MS = 300;
    const handleScroll = () => {
      const top = el.scrollTop;

      if (top < 10) {
        setHeaderCollapsed(false);
        lastScrollTopRef.current = top;
        return;
      }

      if (headerCooldownRef.current) return;
      const delta = top - lastScrollTopRef.current;

      const nearBottom = el.scrollHeight - top - el.clientHeight < 50;
      if (nearBottom) {
        lastScrollTopRef.current = top;
        return;
      }

      if (delta > THRESHOLD) {
        setHeaderCollapsed(true);
        lastScrollTopRef.current = top;
        headerCooldownRef.current = true;
        setTimeout(() => { headerCooldownRef.current = false; }, COOLDOWN_MS);
      } else if (delta < -THRESHOLD) {
        setHeaderCollapsed(false);
        lastScrollTopRef.current = top;
        headerCooldownRef.current = true;
        setTimeout(() => { headerCooldownRef.current = false; }, COOLDOWN_MS);
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [viewMode]);

  return headerCollapsed;
}
