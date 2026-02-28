import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { env } from "@/lib/env";
import { chatTools } from "@/lib/chat/tools";
import { SYSTEM_PROMPT } from "@/lib/chat/systemPrompt";
import { badRequest, serviceUnavailable, internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { checkBodySizeLimit } from "@/lib/api/bodySizeLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { formatTripContextBlock } from "@/lib/chat/serializeTripContext";

const CHAT_MAX_BODY_SIZE = 256 * 1024; // 256KB

const chatRequestSchema = z.object({
  messages: z
    .array(
      z
        .object({
          role: z.enum(["user", "assistant", "system"]),
        })
        .passthrough(),
    )
    .min(1, "At least one message is required"),
  context: z.string().optional(),
  tripContext: z.string().max(10240).optional(),
});

export async function POST(request: NextRequest) {
  const context = createRequestContext(request);

  // Feature flag check
  if (!env.isChatEnabled) {
    return addRequestContextHeaders(
      serviceUnavailable("Chat is currently disabled", {
        route: "/api/chat",
        requestId: context.requestId,
      }),
      context,
    );
  }

  // API key check
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return addRequestContextHeaders(
      serviceUnavailable("Chat is not configured", {
        route: "/api/chat",
        requestId: context.requestId,
      }),
      context,
    );
  }

  // Rate limit: 10 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 10,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  // Body size check
  const bodySizeResult = await checkBodySizeLimit(request, CHAT_MAX_BODY_SIZE);
  if (bodySizeResult) {
    return addRequestContextHeaders(bodySizeResult, context);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return addRequestContextHeaders(
      badRequest("Invalid JSON in request body"),
      context,
    );
  }

  const parsed = chatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return addRequestContextHeaders(
      badRequest(parsed.error.issues[0]?.message ?? "Invalid request body"),
      context,
    );
  }

  try {
    const { messages, context: bodyContext, tripContext } = parsed.data;
    const chatContext = bodyContext ?? request.headers.get("X-Koku-Context");

    // Cap conversation to last 20 messages for cost control
    const recentMessages = messages.slice(-20);

    // Build context-aware system prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (chatContext) {
      const contextParts: string[] = [];
      if (chatContext === "places") {
        contextParts.push("The user is currently browsing the Places map. Prioritize nearby discovery, open-now suggestions, and location-specific advice.");
      } else if (chatContext === "itinerary") {
        contextParts.push("The user is viewing their itinerary. Prioritize schedule advice, logistics between stops, and meal suggestions for gaps in their day.");
      } else if (chatContext === "trip-builder") {
        contextParts.push("The user is building a trip. Help with city selection, duration planning, and vibe matching.");
      } else if (chatContext === "dashboard") {
        contextParts.push("The user is on their dashboard. Help with trip comparisons, general planning, and pre-trip preparation.");
      }
      if (contextParts.length > 0) {
        systemPrompt += `\n\n## Current Context\n\n${contextParts.join("\n")}`;
      }
    }

    // Inject trip context when on itinerary page
    if (tripContext && chatContext === "itinerary") {
      const contextBlock = formatTripContextBlock(tripContext);
      if (contextBlock) {
        systemPrompt += contextBlock;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod passthrough preserves full UIMessage shape; cast needed for SDK compatibility
    const modelMessages = await convertToModelMessages(recentMessages as any);

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages: modelMessages,
      tools: chatTools,
      maxOutputTokens: 1024,
      maxRetries: 1,
      stopWhen: stepCountIs(3),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message = getErrorMessage(error);
    const isQuotaError =
      message.includes("quota") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      message.includes("429");

    if (isQuotaError) {
      logger.warn("Gemini API quota exceeded", { route: "/api/chat" });
      return addRequestContextHeaders(
        serviceUnavailable("Chat is temporarily unavailable. Try again later.", { route: "/api/chat" }),
        context,
      );
    }

    logger.error(
      "Chat API error",
      error instanceof Error ? error : new Error(message),
      { route: "/api/chat", requestId: context.requestId },
    );
    return addRequestContextHeaders(
      internalError("Something went wrong. Try again.", undefined, { route: "/api/chat", requestId: context.requestId }),
      context,
    );
  }
}
