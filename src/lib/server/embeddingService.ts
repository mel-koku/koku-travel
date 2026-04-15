import "server-only";

import { embed, embedMany } from "ai";
import { getEmbeddingModel } from "./llmProvider";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";

type CompositeTextInput = {
  name: string;
  nameJapanese: string | null;
  category: string;
  city: string;
  prefecture: string;
  tags: string[];
  shortDescription: string | null;
};

export function buildCompositeText(input: CompositeTextInput): string {
  const parts: string[] = [input.name];
  if (input.nameJapanese) parts.push(input.nameJapanese);
  parts.push(input.category);
  parts.push(`${input.city}, ${input.prefecture}`);
  if (input.tags.length > 0) parts.push(input.tags.join(", "));
  if (input.shortDescription) parts.push(input.shortDescription);
  return parts.join(" | ");
}

export async function embedText(text: string): Promise<number[] | null> {
  const model = getEmbeddingModel();
  if (!model) {
    logger.warn("No embedding model available");
    return null;
  }
  try {
    const result = await embed({ model, value: text });
    return result.embedding;
  } catch (error) {
    logger.error("Failed to embed text", error, {
      textLength: text.length,
      error: getErrorMessage(error),
    });
    return null;
  }
}

export async function embedBatch(texts: string[]): Promise<number[][] | null> {
  const model = getEmbeddingModel();
  if (!model) {
    logger.warn("No embedding model available");
    return null;
  }
  try {
    const result = await embedMany({ model, values: texts });
    return result.embeddings;
  } catch (error) {
    logger.error("Failed to embed batch", error, {
      batchSize: texts.length,
      error: getErrorMessage(error),
    });
    return null;
  }
}
