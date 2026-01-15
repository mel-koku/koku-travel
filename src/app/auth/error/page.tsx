"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

// Force dynamic rendering since we use useSearchParams()
export const dynamic = "force-dynamic";

type ErrorMessage = {
  title: string;
  description: string;
  action?: string;
};

const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  missing_code: {
    title: "Authorization code missing",
    description:
      "The authentication request is missing the required authorization code. Please try signing in again.",
    action: "Try signing in again",
  },
  invalid_code: {
    title: "Invalid authorization code",
    description:
      "The authorization code provided is invalid or malformed. This may happen if the code has been tampered with or corrupted.",
    action: "Try signing in again",
  },
  expired_code: {
    title: "Authorization code expired",
    description:
      "The authorization code has expired. Authorization codes are only valid for a short period of time for security reasons.",
    action: "Try signing in again",
  },
  authentication_failed: {
    title: "Authentication failed",
    description:
      "We couldn't complete your sign-in. This may be due to a temporary issue with the authentication service.",
    action: "Try signing in again",
  },
  session_creation_failed: {
    title: "Session creation failed",
    description:
      "Your authorization was successful, but we couldn't create your session. Please try signing in again.",
    action: "Try signing in again",
  },
  service_unavailable: {
    title: "Service temporarily unavailable",
    description:
      "The authentication service is currently unavailable. Please try again in a few moments.",
    action: "Try again later",
  },
};

const DEFAULT_ERROR: ErrorMessage = {
  title: "Authentication error",
  description:
    "An unexpected error occurred during authentication. Please try signing in again.",
  action: "Try signing in again",
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get("message") || "unknown";
  const error = ERROR_MESSAGES[errorMessage] || DEFAULT_ERROR;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-md">
        <div className="text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border-4 border-dashed border-red-500 text-2xl font-bold text-red-500">
            !
          </div>
          <h1 className="mb-4 text-3xl font-bold text-gray-900">{error.title}</h1>
          <p className="mb-8 text-gray-600">{error.description}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild variant="primary" href="/">
              <Link href="/">Go home</Link>
            </Button>
            {error.action && (
              <Button asChild variant="secondary" href="/dashboard">
                <Link href="/dashboard">{error.action}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-md">
          <div className="text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
