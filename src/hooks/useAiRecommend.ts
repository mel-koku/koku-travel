"use client";

import { useMutation } from "@tanstack/react-query";
import { extractFetchErrorMessage } from "@/lib/api/fetchError";

/**
 * A single AI recommendation result
 */
export interface AiRecommendation {
  id: string;
  name: string;
  city: string;
  category: string;
  image: string;
  rating: number | null;
  reasoning: string;
  score: number;
  shortDescription?: string;
}

/**
 * Response from the AI recommend endpoint
 */
interface AiRecommendResponse {
  recommendations: AiRecommendation[];
  fallback: boolean;
}

/**
 * Parameters for the AI recommendation request
 */
export interface AiRecommendParams {
  query: string;
  cityId: string;
  dayIndex: number;
  dayActivities: Array<{
    name?: string;
    category?: string;
  }>;
  tripBuilderData?: unknown;
  usedLocationIds: string[];
}

/**
 * Fetches AI-powered place recommendations
 */
async function fetchAiRecommendations(
  params: AiRecommendParams,
): Promise<AiRecommendResponse> {
  const response = await fetch("/api/itinerary/ai-recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(await extractFetchErrorMessage(response));
  }

  return (await response.json()) as AiRecommendResponse;
}

/**
 * React Query mutation hook for AI-powered place recommendations.
 *
 * Fires on user action (Enter key), not automatically.
 * No retry — LLM calls shouldn't auto-retry on failure.
 */
export function useAiRecommend() {
  return useMutation({
    mutationFn: fetchAiRecommendations,
    retry: false,
  });
}
