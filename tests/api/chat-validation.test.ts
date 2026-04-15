import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

// The schema is co-located in the route file but exported for testing
import { chatRequestSchema } from "@/app/api/chat/route";

describe("chatRequestSchema", () => {
  const validMessage = { role: "user" as const, content: "Hello" };

  it("rejects a message with content > 4000 characters", () => {
    const longContent = "a".repeat(4001);
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "user", content: longContent }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const contentIssue = result.error.issues.find(
        (issue) =>
          issue.path.includes("content") || issue.message.includes("4000"),
      );
      expect(contentIssue).toBeDefined();
    }
  });

  it("accepts a message with content exactly 4000 characters", () => {
    const exactContent = "a".repeat(4000);
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "user", content: exactContent }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a message with content under 4000 characters", () => {
    const result = chatRequestSchema.safeParse({
      messages: [validMessage],
    });
    expect(result.success).toBe(true);
  });

  it("accepts messages without a content field (passthrough)", () => {
    // Some SDK messages may have tool_call_id etc. instead of content
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "assistant" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty messages array", () => {
    const result = chatRequestSchema.safeParse({ messages: [] });
    expect(result.success).toBe(false);
  });

  it("rejects when multiple messages exceed the limit", () => {
    const result = chatRequestSchema.safeParse({
      messages: [
        { role: "user", content: "a".repeat(4001) },
        { role: "user", content: "b".repeat(5000) },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Should flag both messages
      const contentIssues = result.error.issues.filter((issue) =>
        issue.message.includes("4000"),
      );
      expect(contentIssues.length).toBe(2);
    }
  });
});
