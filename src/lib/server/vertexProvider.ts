import "server-only";
import { createVertex } from "@ai-sdk/google-vertex";

function buildVertexProvider() {
  const project = process.env.GOOGLE_VERTEX_PROJECT;
  if (!project) {
    throw new Error(
      "GOOGLE_VERTEX_PROJECT env var is required for Vertex AI calls",
    );
  }

  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  return createVertex({
    project,
    location: process.env.GOOGLE_VERTEX_LOCATION ?? "us-central1",
    ...(credentialsJson && {
      googleAuthOptions: {
        credentials: JSON.parse(credentialsJson),
      },
    }),
  });
}

// Lazy singleton: build the provider on first call so module imports (and tests
// that mock generateObject) don't blow up when GOOGLE_VERTEX_PROJECT is absent.
let cachedProvider: ReturnType<typeof buildVertexProvider> | null = null;
function getVertexProvider() {
  if (!cachedProvider) cachedProvider = buildVertexProvider();
  return cachedProvider;
}

export const vertex: ReturnType<typeof buildVertexProvider> = ((
  ...args: Parameters<ReturnType<typeof buildVertexProvider>>
) =>
  getVertexProvider()(
    ...args,
  )) as unknown as ReturnType<typeof buildVertexProvider>;

/**
 * Shared providerOptions for all non-chat Gemini calls.
 *
 * `streamFunctionCallArguments: false` is load-bearing. @ai-sdk/google-vertex@4
 * defaults it to true, which makes Vertex return 400 "streaming function call
 * is not supported in unary API" on every generateObject/generateText call.
 *
 * No thinkingConfig override: gemini-2.5-flash's dynamic budget picks per
 * request. These generators do reasoning-heavy work (intent extraction, day
 * refinement, guide prose under a deny list), and thinking materially improves
 * output quality for cost measured in fractions of a cent per trip.
 */
export const VERTEX_GENERATE_OPTIONS = {
  google: {
    streamFunctionCallArguments: false,
  },
} as const;
