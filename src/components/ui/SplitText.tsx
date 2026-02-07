"use client";

import { motion, useInView, type Variants, type TargetAndTransition } from "framer-motion";
import { useRef, useMemo } from "react";

type SplitTextProps = {
  children: string;
  className?: string;
  splitBy?: "word" | "char";
  trigger?: "inView" | "load";
  animation?: "clipY" | "fadeUp" | "fadeIn";
  staggerDelay?: number;
  duration?: number;
  delay?: number;
  once?: boolean;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
};

type AnimDef = { hidden: TargetAndTransition; visible: TargetAndTransition };

// Pre-create motion components outside render to satisfy react-hooks/static-components
const motionTags = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  p: motion.p,
  span: motion.span,
  div: motion.div,
} as const;

const animations: Record<string, AnimDef> = {
  clipY: {
    hidden: { clipPath: "inset(100% 0 0 0)", y: 20, opacity: 0 },
    visible: { clipPath: "inset(0% 0 0 0)", y: 0, opacity: 1 },
  },
  fadeUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
};

export function SplitText({
  children,
  className = "",
  splitBy = "word",
  trigger = "inView",
  animation = "clipY",
  staggerDelay = 0.04,
  duration = 0.5,
  delay = 0,
  once = true,
  as: Tag = "div",
}: SplitTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-10%" });
  const shouldAnimate = trigger === "load" ? true : isInView;

  const anim = animations[animation] ?? animations.fadeUp!;

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: anim!.hidden,
    visible: {
      ...anim!.visible,
      transition: { duration, ease: [0.25, 0.1, 0.25, 1] },
    },
  };

  const MotionTag = motionTags[Tag];

  const items = useMemo(() => {
    if (splitBy === "char") {
      return children.split("").map((char, i) => ({
        key: `${char}-${i}`,
        content: char === " " ? "\u00A0" : char,
      }));
    }
    return children.split(" ").map((word, i) => ({
      key: `${word}-${i}`,
      content: word,
    }));
  }, [children, splitBy]);

  return (
    <MotionTag
      ref={ref}
      className={`${className} ${splitBy === "char" ? "" : "flex flex-wrap"}`}
      variants={containerVariants}
      initial="hidden"
      animate={shouldAnimate ? "visible" : "hidden"}
      aria-label={children}
    >
      {items.map((item) => (
        <motion.span
          key={item.key}
          variants={itemVariants}
          className={splitBy === "word" ? "mr-[0.3em] inline-block" : "inline-block"}
          style={{ willChange: "transform, opacity" }}
          aria-hidden
        >
          {item.content}
        </motion.span>
      ))}
    </MotionTag>
  );
}
