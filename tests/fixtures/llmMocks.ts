import { vi } from "vitest";

/**
 * LLM mock utilities for testing Gemini integration.
 * Provides helpers to set/clear API key env and mock generateObject.
 *
 * IMPORTANT: The test file must call vi.mock("ai", ...) BEFORE importing
 * this module, and then call `await initLLMMocks()` after mocks are set up.
 */

const ORIGINAL_KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
const ORIGINAL_PROJECT = process.env.GOOGLE_VERTEX_PROJECT;

// Resolved reference to the mocked generateObject
let _generateObject: ReturnType<typeof vi.fn> | null = null;

/** Initialize the mock reference. Must be called after vi.mock("ai"). */
export async function initLLMMocks() {
  const ai = await import("ai");
  _generateObject = ai.generateObject as unknown as ReturnType<typeof vi.fn>;
}

function getGenerateObject(): ReturnType<typeof vi.fn> {
  if (!_generateObject) {
    throw new Error(
      "LLM mocks not initialized. Call `await initLLMMocks()` in beforeAll/beforeEach.",
    );
  }
  return _generateObject;
}

/** Set the Gemini env vars so the code path is entered. */
export function setupLLMEnv() {
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = '{"type":"service_account","project_id":"test","private_key":"test","client_email":"test@test.iam.gserviceaccount.com"}';
  process.env.GOOGLE_VERTEX_PROJECT = "test-project";
}

/** Restore the original env vars. */
export function teardownLLMEnv() {
  if (ORIGINAL_KEY !== undefined) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = ORIGINAL_KEY;
  } else {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  }
  if (ORIGINAL_PROJECT !== undefined) {
    process.env.GOOGLE_VERTEX_PROJECT = ORIGINAL_PROJECT;
  } else {
    delete process.env.GOOGLE_VERTEX_PROJECT;
  }
}

/** Mock `generateObject` from "ai" to return a successful result. */
export function mockGenerateObjectSuccess(result: unknown) {
  getGenerateObject().mockResolvedValue({ object: result });
}

/** Mock `generateObject` from "ai" to throw an error. */
export function mockGenerateObjectFailure(error?: Error) {
  getGenerateObject().mockRejectedValue(
    error ?? new Error("Gemini API error"),
  );
}

/** Mock `generateObject` from "ai" to never resolve (simulates timeout). */
export function mockGenerateObjectTimeout() {
  getGenerateObject().mockImplementation(
    ({ abortSignal }: { abortSignal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        if (abortSignal) {
          abortSignal.addEventListener("abort", () =>
            reject(
              new DOMException("The operation was aborted.", "AbortError"),
            ),
          );
        }
      }),
  );
}
