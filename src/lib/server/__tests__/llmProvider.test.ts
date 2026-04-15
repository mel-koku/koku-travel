import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@ai-sdk/google", () => ({
  google: Object.assign(vi.fn(() => "mock-google-model"), {
    embeddingModel: vi.fn(() => "mock-google-embedding-model"),
  }),
}));

vi.mock("@ai-sdk/google-vertex", () => ({
  vertex: Object.assign(vi.fn(() => "mock-vertex-model"), {
    textEmbeddingModel: vi.fn(() => "mock-vertex-embedding-model"),
  }),
}));

describe("llmProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.LLM_PROVIDER;
    delete process.env.GOOGLE_VERTEX_PROJECT;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getModel", () => {
    it("returns null when no provider credentials are available", async () => {
      const { getModel } = await import("../llmProvider");
      expect(getModel()).toBeNull();
    });

    it("returns google model when only API key is present", async () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
      const { getModel } = await import("../llmProvider");
      const model = getModel();
      expect(model).not.toBeNull();
    });

    it("returns vertex model when Vertex creds are present", async () => {
      process.env.GOOGLE_VERTEX_PROJECT = "my-project";
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = '{"type":"service_account"}';
      const { getModel } = await import("../llmProvider");
      const model = getModel();
      expect(model).not.toBeNull();
    });

    it("respects LLM_PROVIDER=google override even with Vertex creds", async () => {
      process.env.LLM_PROVIDER = "google";
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
      process.env.GOOGLE_VERTEX_PROJECT = "my-project";
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = '{"type":"service_account"}';
      const { getModel, isVertexProvider } = await import("../llmProvider");
      const model = getModel();
      expect(model).not.toBeNull();
      expect(isVertexProvider()).toBe(false);
    });

    it("respects LLM_PROVIDER=vertex override", async () => {
      process.env.LLM_PROVIDER = "vertex";
      process.env.GOOGLE_VERTEX_PROJECT = "my-project";
      const { getModel, isVertexProvider } = await import("../llmProvider");
      const model = getModel();
      expect(model).not.toBeNull();
      expect(isVertexProvider()).toBe(true);
    });
  });

  describe("isVertexProvider", () => {
    it("returns false when using google provider", async () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
      const { isVertexProvider } = await import("../llmProvider");
      expect(isVertexProvider()).toBe(false);
    });

    it("returns false when no provider available", async () => {
      const { isVertexProvider } = await import("../llmProvider");
      expect(isVertexProvider()).toBe(false);
    });
  });

  describe("VERTEX_PROVIDER_OPTIONS", () => {
    it("disables streamFunctionCallArguments", async () => {
      const { VERTEX_PROVIDER_OPTIONS } = await import("../llmProvider");
      expect(VERTEX_PROVIDER_OPTIONS).toEqual({
        google: { streamFunctionCallArguments: false },
      });
    });
  });

  describe("getEmbeddingModel", () => {
    it("returns null when no provider available", async () => {
      const { getEmbeddingModel } = await import("../llmProvider");
      expect(getEmbeddingModel()).toBeNull();
    });

    it("returns embedding model when google provider available", async () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
      const { getEmbeddingModel } = await import("../llmProvider");
      const model = getEmbeddingModel();
      expect(model).not.toBeNull();
    });

    it("returns embedding model when vertex provider available", async () => {
      process.env.GOOGLE_VERTEX_PROJECT = "my-project";
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = '{"type":"service_account"}';
      const { getEmbeddingModel } = await import("../llmProvider");
      const model = getEmbeddingModel();
      expect(model).not.toBeNull();
    });
  });
});
