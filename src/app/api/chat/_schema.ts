import { z } from "zod";

const CHAT_MESSAGE_MAX_LENGTH = 4000;

const uiMessagePartSchema = z
  .object({ type: z.string() })
  .passthrough();

export const chatRequestSchema = z.object({
  messages: z
    .array(
      z
        .object({
          role: z.enum(["user", "assistant", "system"]),
          parts: z
            .array(uiMessagePartSchema)
            .min(1, "Message must contain at least one part"),
        })
        .passthrough(),
    )
    .min(1, "At least one message is required")
    .superRefine((messages, ctx) => {
      for (let i = 0; i < messages.length; i++) {
        const parts = (messages[i] as { parts?: Array<{ type?: string; text?: unknown }> }).parts ?? [];
        const textLen = parts.reduce((n, p) => {
          return p.type === "text" && typeof p.text === "string" ? n + p.text.length : n;
        }, 0);
        if (textLen > CHAT_MESSAGE_MAX_LENGTH) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_big,
            maximum: CHAT_MESSAGE_MAX_LENGTH,
            type: "string",
            inclusive: true,
            message: `Message content must be at most ${CHAT_MESSAGE_MAX_LENGTH} characters`,
            path: [i, "parts"],
          });
        }
      }
    }),
  context: z.string().optional(),
  tripContext: z.string().max(10240).optional(),
});
