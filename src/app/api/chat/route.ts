import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { getModel, VERTEX_PROVIDER_OPTIONS } from "@/lib/server/llmProvider";
import { z } from "zod";
import { env } from "@/lib/env";
import { chatTools } from "@/lib/chat/tools";
import { SYSTEM_PROMPT } from "@/lib/chat/systemPrompt";
import { badRequest, serviceUnavailable, internalError } from "@/lib/api/errors";
import { checkBodySizeLimit } from "@/lib/api/bodySizeLimit";
import { RATE_LIMITS, DAILY_QUOTAS } from "@/lib/api/rateLimits";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { extractApiErrorDetails } from "@/lib/utils/apiErrorDetails";
import { formatTripContextBlock } from "@/lib/chat/serializeTripContext";

export const maxDuration = 60;

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

export const POST = withApiHandler(async (request: NextRequest, { context }) => {
  // Feature flag check
  if (!env.isChatEnabled) {
    return serviceUnavailable("Chat is currently disabled", {
      route: "/api/chat",
      requestId: context.requestId,
    });
  }

  // API key check
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return serviceUnavailable("Chat is not configured", {
      route: "/api/chat",
      requestId: context.requestId,
    });
  }

  // Body size check
  const bodySizeResult = await checkBodySizeLimit(request, CHAT_MAX_BODY_SIZE);
  if (bodySizeResult) {
    return bodySizeResult;
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return badRequest("Invalid JSON in request body");
  }

  const parsed = chatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  try {
    const { messages, context: bodyContext, tripContext } = parsed.data;
    const chatContext = bodyContext ?? request.headers.get("X-Yuku-Context");

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

    const model = getModel();
    if (!model) {
      return serviceUnavailable("AI chat is not available");
    }

    const result = streamText({
      model,
      providerOptions: VERTEX_PROVIDER_OPTIONS,
      system: systemPrompt,
      messages: modelMessages,
      tools: chatTools,
      maxOutputTokens: 2048,
      maxRetries: 1,
      stopWhen: stepCountIs(3),
      // Stream errors don't bubble to the outer try/catch because
      // toUIMessageStreamResponse() has already returned a 200 by the time
      // Vertex rejects mid-stream. Log them here so regressions surface in
      // structured logs instead of a raw console dump.
      onError: ({ error }) => {
        const details = extractApiErrorDetails(error);
        logger.error(
          "Chat stream error",
          error instanceof Error ? error : new Error(getErrorMessage(error)),
          { route: "/api/chat", requestId: context.requestId, ...details },
        );
      },
    });

    return result.toUIMessageStreamResponse() as unknown as NextResponse;
  } catch (error) {
    const message = getErrorMessage(error);
    const isQuotaError =
      message.includes("quota") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      message.includes("429");

    if (isQuotaError) {
      logger.warn("Gemini API quota exceeded", { route: "/api/chat" });
      return serviceUnavailable("Chat is temporarily unavailable. Try again later.", { route: "/api/chat" });
    }

    const apiDetails = extractApiErrorDetails(error);
    logger.error(
      "Chat API error",
      error instanceof Error ? error : new Error(message),
      { route: "/api/chat", requestId: context.requestId, ...apiDetails },
    );
    return internalError("Something went wrong. Try again.", undefined, { route: "/api/chat", requestId: context.requestId });
  }
}, { rateLimit: RATE_LIMITS.CHAT, dailyQuota: DAILY_QUOTAS.CHAT, optionalAuth: true, requireJson: true });
