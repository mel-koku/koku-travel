"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, animate } from "framer-motion";
import { easeReveal } from "@/lib/motion";

type AnimatedNumberProps = {
  value: number;
  className?: string;
  duration?: number;
  formatOptions?: Intl.NumberFormatOptions;
};

export function AnimatedNumber({
  value,
  className = "",
  duration = 1.5,
  formatOptions,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const controls = animate(0, value, {
      duration,
      ease: easeReveal,
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });

    return () => controls.stop();
  }, [isInView, value, duration]);

  const formatted = formatOptions
    ? displayValue.toLocaleString(undefined, formatOptions)
    : displayValue.toLocaleString();

  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  );
}
