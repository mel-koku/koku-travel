import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Creates a debounced version of a function that delays invocation
 * until after `ms` milliseconds have elapsed since the last call.
 *
 * @param fn - The function to debounce
 * @param ms - The debounce delay in milliseconds (default: 300)
 * @returns A debounced version of the function
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  ms = 300,
): (...args: TArgs) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: TArgs) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, ms);
  };
}
