import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/api/rateLimit";

/**
 * CSP violation report endpoint.
 *
 * Browsers POST here when a resource is blocked by our Content Security
 * Policy. Logged via logger so violations surface in Vercel/Sentry instead
 * of silently breaking features (like the GA4 block that shipped unnoticed).
 *
 * Public: unauthenticated — browsers send these without credentials.
 * Whitelisted in middleware.ts PUBLIC_API_ROUTES.
 */

type CspReport = {
  "document-uri"?: string;
  referrer?: string;
  "violated-directive"?: string;
  "effective-directive"?: string;
  "original-policy"?: string;
  disposition?: string;
  "blocked-uri"?: string;
  "line-number"?: number;
  "column-number"?: number;
  "source-file"?: string;
  "status-code"?: number;
  "script-sample"?: string;
};

const IGNORED_BLOCKED_URIS = new Set([
  "about",
  "about:blank",
  "chrome-extension",
  "moz-extension",
  "safari-extension",
  "safari-web-extension",
  "webkit-masked-url",
  "inline",
  "eval",
]);

function shouldIgnore(report: CspReport): boolean {
  const blocked = report["blocked-uri"] ?? "";
  if (!blocked) return false;
  if (IGNORED_BLOCKED_URIS.has(blocked)) return true;
  const scheme = blocked.split(":")[0]?.toLowerCase();
  if (scheme && IGNORED_BLOCKED_URIS.has(scheme)) return true;
  return false;
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 60,
    windowMs: 60_000,
    keySuffix: "csp-report",
  });
  if (rateLimitResponse) {
    return new NextResponse(null, { status: 204 });
  }

  let report: CspReport | null = null;
  try {
    const raw = await request.text();
    if (!raw) {
      return new NextResponse(null, { status: 204 });
    }
    const body = JSON.parse(raw) as { "csp-report"?: CspReport } | CspReport;
    report = (body as { "csp-report"?: CspReport })["csp-report"] ?? (body as CspReport);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  if (!report || shouldIgnore(report)) {
    return new NextResponse(null, { status: 204 });
  }

  logger.warn("CSP violation", {
    directive: report["violated-directive"] ?? report["effective-directive"],
    blockedUri: report["blocked-uri"],
    documentUri: report["document-uri"],
    sourceFile: report["source-file"],
    lineNumber: report["line-number"],
    sample: report["script-sample"],
    userAgent: request.headers.get("user-agent"),
  });

  return new NextResponse(null, { status: 204 });
}
