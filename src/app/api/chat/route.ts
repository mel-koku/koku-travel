import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import { env } from "@/lib/env";
import { chatTools } from "@/lib/chat/tools";
import { SYSTEM_PROMPT } from "@/lib/chat/systemPrompt";
import { serviceUnavailable } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
import { logger } from "@/lib/logger";

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
    const { messages } = await request.json();

    // Cap conversation to last 20 messages for cost control
    const recentMessages = messages.slice(-20);

    const modelMessages = await convertToModelMessages(recentMessages);

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools: chatTools,
      maxOutputTokens: 1024,
      maxRetries: 1,
      stopWhen: stepCountIs(3),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    const isQuotaError =
      message.includes("quota") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      message.includes("429");

    if (isQuotaError) {
      logger.warn("Gemini API quota exceeded", { route: "/api/chat" });
      return NextResponse.json(
        { error: "Chat is temporarily unavailable. Try again later." },
        { status: 503 },
      );
    }

    logger.error(
      "Chat API error",
      error instanceof Error ? error : new Error(message),
      { route: "/api/chat", requestId: context.requestId },
    );
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}
