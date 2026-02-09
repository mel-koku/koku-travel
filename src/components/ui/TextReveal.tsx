"use client";

import { SplitText } from "./SplitText";
import { staggerWord, durationBase } from "@/lib/motion";

type TextRevealProps = {
  children: string;
  className?: string;
  splitBy?: "word" | "char";
  animation?: "clipY" | "fadeUp" | "fadeIn";
  staggerDelay?: number;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
};

export function TextReveal({
  children,
  className = "",
  splitBy = "word",
  animation = "clipY",
  staggerDelay = staggerWord,
  delay = 0,
  as = "h2",
}: TextRevealProps) {
  return (
    <SplitText
      as={as}
      className={className}
      splitBy={splitBy}
      trigger="inView"
      animation={animation}
      staggerDelay={staggerDelay}
      delay={delay}
      duration={durationBase}
    >
      {children}
    </SplitText>
  );
}
