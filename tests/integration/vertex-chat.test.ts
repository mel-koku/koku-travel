/**
 * Live Vertex AI integration test for the chat streamText + tools path.
 *
 * This test exercises the real @ai-sdk/google-vertex wire format to catch
 * SDK-level regressions (e.g. streamFunctionCallArguments serialization bugs)
 * that unit tests cannot detect because they mock above the provider layer.
 *
 * Gated: runs only when RUN_VERTEX_INTEGRATION=1 is set.
 * Skips gracefully when credentials are absent.
 */
import { describe, it, expect } from "vitest";

// Mock server-only so vertexProvider.ts can be imported in test env
vi.mock("server-only", () => ({}));

const hasEnvGate = process.env.RUN_VERTEX_INTEGRATION === "1";
const hasCreds =
  !!process.env.GOOGLE_VERTEX_PROJECT &&
  process.env.GOOGLE_VERTEX_PROJECT !== "test-project" &&
  !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

const shouldRun = hasEnvGate && hasCreds;

describe("Vertex AI chat integration", () => {
  it(
    "streamText with a tool completes without wire-format errors",
    { timeout: 30_000, skip: !shouldRun },
    async () => {
      // Dynamic imports so module-level env validation only runs when gated in
      const { streamText, tool } = await import("ai");
      const { z } = await import("zod");
      const { vertex, VERTEX_CHAT_OPTIONS } = await import(
        "@/lib/server/vertexProvider"
      );

      // Minimal tool that the model can call without any DB or external deps
      const echoTool = tool({
        description:
          "Echo back the user's question. Always call this tool to confirm you received the message.",
        inputSchema: z.object({
          message: z.string().describe("The user's message to echo back"),
        }),
        execute: async ({ message }) => ({ echoed: message }),
      });

      const result = streamText({
        model: vertex("gemini-2.5-flash"),
        providerOptions: VERTEX_CHAT_OPTIONS,
        system: "You are a test assistant. Always use the echo tool to respond.",
        messages: [{ role: "user", content: "Hello, this is an integration test." }],
        tools: { echo: echoTool },
        maxOutputTokens: 256,
        maxRetries: 1,
      });

      // Consume the full stream. The assertion is that this completes without
      // throwing a wire-format error (e.g. 400 "streaming function call is not
      // supported in unary API").
      const chunks: string[] = [];
      let hasToolCall = false;

      for await (const part of result.fullStream) {
        if (part.type === "text-delta") {
          chunks.push(part.textDelta);
        }
        if (part.type === "tool-call") {
          hasToolCall = true;
        }
      }

      // The model should produce either text or a tool call (or both).
      // We don't assert on content (non-deterministic), only that the stream
      // completed and produced something.
      const hasText = chunks.length > 0;
      expect(
        hasText || hasToolCall,
        "Stream completed but produced neither text nor a tool call",
      ).toBe(true);
    },
  );
});
