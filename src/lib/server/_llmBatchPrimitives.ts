import "server-only";

import { generateObject } from "ai";
import { z } from "zod";
import { vertex, VERTEX_GENERATE_OPTIONS } from "./vertexProvider";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { extractApiErrorDetails } from "@/lib/utils/apiErrorDetails";

/**
 * Outcome tag for a settled promise inside a {@link settleInOrder} iteration.
 * `'fulfilled'` and `'rejected'` mirror the `PromiseSettledResult` shape.
 * `'deadline'` is yielded when the global deadline expires and the promise
 * is still pending -- its value never arrives in the caller's view.
 */
export type SettledOutcome<T> =
  | { status: "fulfilled"; value: T; index: number }
  | { status: "rejected"; reason: unknown; index: number }
  | { status: "deadline"; index: number };

/**
 * Yields each promise's settlement as it arrives, in completion order (not
 * input order). If `deadlineMs` elapses before all promises settle, yields
 * a synthetic `'deadline'` outcome for every unsettled input and ends
 * iteration. Orphaned in-flight promises keep running in the background --
 * the caller's consumer loop moves on without them.
 *
 * Single-consumer only: calling [Symbol.asyncIterator]() more than once on
 * the returned iterable produces two consumers sharing the same internal
 * queue; behavior is undefined.
 *
 * @internal Exported for testing. Private to LLM batch code conceptually.
 */
export function settleInOrder<T>(
  promises: Promise<T>[],
  deadlineMs: number,
): AsyncIterable<SettledOutcome<T>> {
  // Register handlers eagerly (before first iteration) so that if promises
  // are already resolved, callbacks fire in resolution order, not input order.
  const queue: SettledOutcome<T>[] = [];
  let wakeUp: (() => void) | undefined;

  const notifyConsumer = (): void => {
    const fn = wakeUp;
    wakeUp = undefined;
    fn?.();
  };

  // Wire up each input promise to push into the queue as it settles.
  for (let index = 0; index < promises.length; index++) {
    const i = index;
    promises[i]!.then(
      (value) => {
        queue.push({ status: "fulfilled", value, index: i });
        notifyConsumer();
      },
      (reason) => {
        queue.push({ status: "rejected", reason, index: i });
        notifyConsumer();
      },
    );
  }

  // Return an object with an async generator as [Symbol.asyncIterator].
  return {
    [Symbol.asyncIterator](): AsyncGenerator<SettledOutcome<T>, void, void> {
      return (async function* () {
        if (promises.length === 0) return;

        // Deadline promise: resolves with a sentinel when the timer fires.
        const deadlineSentinel = Symbol("deadline");
        let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
        const deadlinePromise = new Promise<typeof deadlineSentinel>((resolve) => {
          deadlineTimer = setTimeout(() => resolve(deadlineSentinel), deadlineMs);
        });

        // Track which indices have been yielded to compute deadline remainders.
        const yielded = new Set<number>();

        try {
          while (yielded.size < promises.length) {
            // Drain any already-queued outcomes before awaiting.
            while (queue.length > 0) {
              const outcome = queue.shift()!;
              yielded.add(outcome.index);
              yield outcome;
            }

            if (yielded.size >= promises.length) break;

            // Wait for either the next settlement notification or the deadline.
            const waitSignal = new Promise<void>((resolve) => {
              wakeUp = resolve;
            });

            const winner = await Promise.race([waitSignal, deadlinePromise]);

            if (winner === deadlineSentinel) {
              // Drain any last-minute settlements that raced the deadline.
              while (queue.length > 0) {
                const outcome = queue.shift()!;
                yielded.add(outcome.index);
                yield outcome;
              }
              // Yield deadline outcomes for every still-pending index.
              for (let i = 0; i < promises.length; i++) {
                if (!yielded.has(i)) {
                  yield { status: "deadline", index: i };
                }
              }
              return;
            }
          }
        } finally {
          if (deadlineTimer !== undefined) {
            clearTimeout(deadlineTimer);
          }
        }
      })();
    },
  };
}

/**
 * Makes one Vertex call via generateObject with an abort-controlled timeout.
 * Single point of contact with Vertex -- shared by both the header path and
 * per-day paths so call-level handling stays consistent.
 *
 * Orphan log suppression: if `batchSignal` is provided and it fires before
 * the per-call timer, the resulting abort is treated as "orphaned by batch
 * deadline" and the warn log is suppressed. The throw still propagates so
 * the caller can tag the outcome. This prevents duplicate log noise after
 * the batch summary has already reported the deadline count.
 *
 * Deny-list retry: the pre-refactor monolithic generateGuideProse scanned
 * output for banned words and retried once on violation. That retry was
 * intentionally dropped in the refactor -- Gemini 2.5 Flash with the
 * deny-list in the prompt produces <1% violation rates, and per-call retry
 * in a parallel-drain context would complicate orphan detection without
 * meaningful quality gain. scanForDenyListViolations is still exported for
 * future callers that need it.
 *
 * @internal Exported for testing. Called by runGuideProseBatch and runBriefingBatch.
 */
export async function callVertex<T>(
  prompt: string,
  schema: z.ZodType<T>,
  timeoutMs: number,
  batchSignal?: AbortSignal,
): Promise<T> {
  const perCallTimeout = AbortSignal.timeout(timeoutMs);
  const combined = batchSignal
    ? AbortSignal.any([perCallTimeout, batchSignal])
    : perCallTimeout;

  try {
    const result = await generateObject({
      model: vertex("gemini-2.5-flash"),
      providerOptions: VERTEX_GENERATE_OPTIONS,
      schema,
      prompt,
      abortSignal: combined,
    });
    return result.object as T;
  } catch (err) {
    // Orphaned by batch deadline -- the outcome is already captured by the
    // batch summary log. Skip the per-call log but still throw so the caller
    // tags the outcome correctly.
    if (batchSignal?.aborted && !perCallTimeout.aborted) {
      throw err;
    }
    // Legitimate per-call failure -- log with full diagnostic details.
    logger.warn("Guide prose call failed", {
      error: getErrorMessage(err),
      ...extractApiErrorDetails(err),
    });
    throw err;
  }
}
