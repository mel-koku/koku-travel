// Live integration smoke for callVertexGroundedText.
// Skipped unless RUN_GROUNDING_SMOKE=1 — otherwise it'd burn real Vertex spend on every CI run.
// To execute:
//   RUN_GROUNDING_SMOKE=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run src/lib/server/__tests__/_groundingSmoke.test.ts

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { callVertexGroundedText } from "../_llmBatchPrimitives";

const RUN_LIVE = process.env.RUN_GROUNDING_SMOKE === "1";

describe.skipIf(!RUN_LIVE)("grounding smoke (live)", () => {
  it("calls real Vertex with googleSearch and returns a grounded answer", async () => {
    if (!process.env.GOOGLE_VERTEX_PROJECT) {
      throw new Error(
        "GOOGLE_VERTEX_PROJECT not set — load .env.local before running this smoke",
      );
    }

    const text = await callVertexGroundedText(
      "In one sentence, are the Tokyo trains running normally today, and cite the source domain you used.",
      25_000,
      undefined,
      undefined,
      "smoke-test",
    );

    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(10);
    // Surface the grounded response for manual inspection — this smoke is
    // human-gated (RUN_GROUNDING_SMOKE=1) and the whole point is reading the
    // model output, not just asserting shape.
    // eslint-disable-next-line no-console
    console.log("\n=== GROUNDED RESPONSE ===\n" + text + "\n=========================\n");
  }, 30_000);
});
