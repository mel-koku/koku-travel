/**
 * Shared motion constants for Variant C components.
 * All animations gated behind useReducedMotion() in consuming components.
 */

export const cEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

export const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: cEase },
  },
});

export const scaleIn = (delay = 0) => ({
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, delay, ease: cEase },
  },
});

export const slideRight = (delay = 0) => ({
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, delay, ease: cEase },
  },
});
