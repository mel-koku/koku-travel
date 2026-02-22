import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import { env } from "@/lib/env";
import { chatTools } from "@/lib/chat/tools";
import { SYSTEM_PROMPT } from "@/lib/chat/systemPrompt";
import { serviceUnavailable, internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";

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

  // Rate limit: 20 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 20,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  try {
    const body = await request.json();
    const messages = body.messages;
    const context = body.context ?? request.headers.get("X-Koku-Context");

    // Cap conversation to last 20 messages for cost control
    const recentMessages = messages.slice(-20);

    // Build context-aware system prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (context) {
      const contextParts: string[] = [];
      if (context === "places") {
        contextParts.push("The user is currently browsing the Places map. Prioritize nearby discovery, open-now suggestions, and location-specific advice.");
      } else if (context === "itinerary") {
        contextParts.push("The user is viewing their itinerary. Prioritize schedule advice, logistics between stops, and meal suggestions for gaps in their day.");
      } else if (context === "trip-builder") {
        contextParts.push("The user is building a trip. Help with city selection, duration planning, and vibe matching.");
      } else if (context === "dashboard") {
        contextParts.push("The user is on their dashboard. Help with trip comparisons, general planning, and pre-trip preparation.");
      }
      if (contextParts.length > 0) {
        systemPrompt += `\n\n## Current Context\n\n${contextParts.join("\n")}`;
      }
    }

    const modelMessages = await convertToModelMessages(recentMessages);

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
