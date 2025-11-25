import type { NextConfig } from "next";

const localPatterns = [
  {
    pathname: "/api/places/photo",
  },
];

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

const remotePatterns: Array<{
  protocol: "http" | "https";
  hostname: string;
  pathname?: string;
  port?: string;
}> = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
  },
  {
    protocol: "https",
    hostname: "cdn.sanity.io",
  },
  {
    protocol: "https",
    hostname: "images.pexels.com",
  },
  {
    protocol: "https",
    hostname: "cdn.pixabay.com",
  },
];

if (siteUrl) {
  try {
    const { protocol, hostname, port } = new URL(siteUrl);
    const protocolValue = protocol.replace(":", "") as "http" | "https";
    const pattern: {
      protocol: "http" | "https";
      hostname: string;
      pathname?: string;
      port?: string;
    } = {
      protocol: protocolValue,
      hostname,
      pathname: "/api/places/photo",
    };
    if (port) {
      pattern.port = port;
    }
    remotePatterns.push(pattern);
  } catch {
    // ignore invalid NEXT_PUBLIC_SITE_URL
  }
}

// Security headers configuration
const isProduction = process.env.NODE_ENV === "production";

// CSP directives - Next.js requires 'unsafe-inline' for hydration scripts
// In production, Next.js uses nonce-based CSP, but we need to allow inline scripts for hydration
const scriptSrc = isProduction
  ? ["'self'", "'unsafe-inline'", "https://unpkg.com"] // Production: allow inline for Next.js hydration + unpkg.com for Leaflet
  : ["'self'", "'unsafe-eval'", "'unsafe-inline'", "https://unpkg.com"]; // Development: allow for Next.js hot reload + unpkg.com

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc.join(" ")}`, // Allow inline scripts for Next.js hydration
      "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com", // Allow Google Fonts stylesheets + Tailwind CSS inline styles
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com", // Allow Google Fonts
      "connect-src 'self' https://*.supabase.co https://*.sanity.io https://*.googleapis.com https://api.mapbox.com https://*.sentry.io",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    localPatterns,
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Turbopack configuration (empty - using defaults)
  turbopack: {},
  // Note: Request body size limits are enforced in API route handlers
  // Next.js 16 App Router doesn't support the old api.bodyParser.sizeLimit config
  // Use checkBodySizeLimit() or readBodyWithSizeLimit() from @/lib/api/bodySizeLimit
  // Default limit is 1MB, but individual routes can set stricter limits
  // Note: instrumentationHook is enabled by default in Next.js 16+ when instrumentation.ts exists
};

// Conditionally wrap with Sentry if DSN is configured and package is installed
// Sentry is enabled when either SENTRY_DSN (server-side) or NEXT_PUBLIC_SENTRY_DSN (client-side) is set
// To enable Sentry in production:
// 1. Set SENTRY_DSN for server-side error tracking (required for API routes and server components)
// 2. Set NEXT_PUBLIC_SENTRY_DSN for client-side error tracking (required for browser errors)
// 3. Optionally set SENTRY_ORG and SENTRY_PROJECT for better organization
// Note: The wrapper is applied if either DSN is set to ensure proper build-time configuration
let finalConfig: NextConfig = nextConfig;

if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { withSentryConfig } = require("@sentry/nextjs");
    const sentryConfig: {
      silent: boolean;
      org?: string;
      project?: string;
    } = {
      silent: true,
    };
    
    // Only include org and project if they are defined
    if (process.env.SENTRY_ORG) {
      sentryConfig.org = process.env.SENTRY_ORG;
    }
    if (process.env.SENTRY_PROJECT) {
      sentryConfig.project = process.env.SENTRY_PROJECT;
    }
    
    finalConfig = withSentryConfig(nextConfig, sentryConfig);
  } catch {
    // Sentry not available, use default config
    // This is fine - Sentry is optional
  }
}

export default finalConfig;
