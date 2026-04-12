import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("ai", () => ({
  embed: vi.fn(),
  embedMany: vi.fn(),
}));

vi.mock("../llmProvider", () => ({
  getEmbeddingModel: vi.fn(() => "mock-embedding-model"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { buildCompositeText, embedText, embedBatch } from "../embeddingService";
import { embed, embedMany } from "ai";

const mockEmbed = vi.mocked(embed);
const mockEmbedMany = vi.mocked(embedMany);

describe("buildCompositeText", () => {
  it("joins all fields with pipe separator", () => {
    const result = buildCompositeText({
      name: "Kinkaku-ji",
      nameJapanese: "金閣寺",
      category: "temple",
      city: "Kyoto",
      prefecture: "Kyoto",
      tags: ["culture", "iconic", "photography"],
      shortDescription: "Golden pavilion set in a reflective pond garden",
    });
    expect(result).toBe(
      "Kinkaku-ji | 金閣寺 | temple | Kyoto, Kyoto | culture, iconic, photography | Golden pavilion set in a reflective pond garden"
    );
  });

  it("handles missing optional fields gracefully", () => {
    const result = buildCompositeText({
      name: "Test Place",
      nameJapanese: null,
      category: "restaurant",
      city: "Tokyo",
      prefecture: "Tokyo",
      tags: [],
      shortDescription: null,
    });
    expect(result).toBe("Test Place | restaurant | Tokyo, Tokyo");
  });
});

describe("embedText", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns embedding array on success", async () => {
    mockEmbed.mockResolvedValueOnce({
      embedding: [0.1, 0.2, 0.3],
      usage: { tokens: 10 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await embedText("test text");
    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(mockEmbed).toHaveBeenCalledWith({
      model: "mock-embedding-model",
      value: "test text",
    });
  });

  it("returns null on API error", async () => {
    mockEmbed.mockRejectedValueOnce(new Error("API error"));
    const result = await embedText("test text");
    expect(result).toBeNull();
  });
});

describe("embedBatch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns embeddings for batch of texts", async () => {
    mockEmbedMany.mockResolvedValueOnce({
      embeddings: [[0.1], [0.2], [0.3]],
      usage: { tokens: 30 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await embedBatch(["text1", "text2", "text3"]);
    expect(result).toEqual([[0.1], [0.2], [0.3]]);
  });

  it("returns null on API error", async () => {
    mockEmbedMany.mockRejectedValueOnce(new Error("API error"));
    const result = await embedBatch(["text1"]);
    expect(result).toBeNull();
  });
});
