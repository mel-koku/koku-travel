import "@testing-library/jest-dom";
import { vi } from "vitest";

// Set default environment variables for tests
process.env.GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "test-api-key";

// Mock Next.js headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  draftMode: vi.fn().mockResolvedValue({
    enable: vi.fn(),
    disable: vi.fn(),
    isEnabled: false,
  }),
}));

// Mock Next.js cache functions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock Next.js server (NextRequest, NextResponse)
vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return {
    ...actual,
    NextRequest: class NextRequest extends Request {
      nextUrl: URL;
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        let url: URL;
        if (typeof input === "string") {
          url = new URL(input);
        } else if (input instanceof URL) {
          url = input;
        } else {
          url = new URL(input.url);
        }
        super(input, init);
        this.nextUrl = url;
        // Make nextUrl.searchParams accessible
        Object.defineProperty(this.nextUrl, "searchParams", {
          value: url.searchParams,
          writable: false,
          enumerable: true,
          configurable: false,
        });
      }
    },
  };
});

// Mock logger to prevent stderr output in tests
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

