import { NextRequest } from "next/server";
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

  // Rate limit: 20 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 20,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  const { messages } = await request.json();

  // Cap conversation to last 20 messages for cost control
  const recentMessages = messages.slice(-20);

  const modelMessages = await convertToModelMessages(recentMessages);

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: chatTools,
    maxOutputTokens: 1024,
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
