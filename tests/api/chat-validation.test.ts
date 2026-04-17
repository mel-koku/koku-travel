import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

// The schema is co-located in the route file but exported for testing
import { chatRequestSchema } from "@/app/api/chat/route";

const textMessage = (text: string, role: "user" | "assistant" | "system" = "user") => ({
  role,
  parts: [{ type: "text", text }],
});

describe("chatRequestSchema", () => {
  it("rejects a message whose text parts sum to > 4000 characters", () => {
    const result = chatRequestSchema.safeParse({
      messages: [textMessage("a".repeat(4001))],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const contentIssue = result.error.issues.find((issue) =>
        issue.message.includes("4000"),
      );
      expect(contentIssue).toBeDefined();
    }
  });

  it("accepts a message whose text parts sum to exactly 4000 characters", () => {
    const result = chatRequestSchema.safeParse({
      messages: [textMessage("a".repeat(4000))],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a normal short user message", () => {
    const result = chatRequestSchema.safeParse({
      messages: [textMessage("Hello")],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a user message with no parts array (production crash case)", () => {
    // Regression: Sentry 7418908155 — convertToModelMessages crashes when
    // message.parts is undefined. The schema must reject this at the boundary.
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a user message with an empty parts array", () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "user", parts: [] }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts non-text parts (passthrough for tool/file parts)", () => {
    const result = chatRequestSchema.safeParse({
      messages: [
        {
          role: "assistant",
          parts: [{ type: "tool-getWeather", state: "output-available", input: {}, output: {} }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty messages array", () => {
    const result = chatRequestSchema.safeParse({ messages: [] });
    expect(result.success).toBe(false);
  });

  it("flags multiple over-length messages", () => {
    const result = chatRequestSchema.safeParse({
      messages: [
        textMessage("a".repeat(4001)),
        textMessage("b".repeat(5000)),
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const contentIssues = result.error.issues.filter((issue) =>
        issue.message.includes("4000"),
      );
      expect(contentIssues.length).toBe(2);
    }
  });
});
