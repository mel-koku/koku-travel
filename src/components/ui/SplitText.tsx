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
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
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
      // Group characters by word so line breaks only happen between words
      const words = children.split(" ");
      let globalCharIndex = 0;
      return words.map((word, wordIdx) => ({
        wordKey: `word-${wordIdx}`,
        chars: word.split("").map((char) => ({
          key: `${char}-${globalCharIndex}`,
          content: char,
          index: globalCharIndex++,
        })),
        spaceIndex: globalCharIndex++, // space between words counts as a character for timing
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
      {splitBy === "char"
        ? (items as { wordKey: string; chars: { key: string; content: string; index: number }[]; spaceIndex: number }[]).map(
            (word, wordIdx, arr) => (
              <span key={word.wordKey} className="inline-flex" aria-hidden>
                {word.chars.map((char) => (
                  <motion.span
                    key={char.key}
                    initial={anim!.hidden}
                    animate={shouldAnimate ? {
                      ...anim!.visible,
                      transition: { duration, ease: [0.25, 0.1, 0.25, 1], delay: delay + char.index * staggerDelay },
                    } : anim!.hidden}
                    className="inline-block"
                    style={{ willChange: "transform, opacity" }}
                  >
                    {char.content}
                  </motion.span>
                ))}
                {wordIdx < arr.length - 1 && (
                  <motion.span
                    key={`space-${wordIdx}`}
                    initial={anim!.hidden}
                    animate={shouldAnimate ? {
                      ...anim!.visible,
                      transition: { duration, ease: [0.25, 0.1, 0.25, 1], delay: delay + word.spaceIndex * staggerDelay },
                    } : anim!.hidden}
                    className="inline-block"
                    style={{ willChange: "transform, opacity" }}
                  >
                    {"\u00A0"}
                  </motion.span>
                )}
              </span>
            )
          )
        : (items as { key: string; content: string }[]).map((item) => (
            <motion.span
              key={item.key}
              variants={itemVariants}
              className="mr-[0.3em] inline-block"
              style={{ willChange: "transform, opacity" }}
              aria-hidden
            >
              {item.content}
            </motion.span>
          ))}
    </MotionTag>
  );
}
