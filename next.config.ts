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
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // 'unsafe-eval' needed for Next.js in dev, 'unsafe-inline' for inline scripts
      "style-src 'self' 'unsafe-inline'", // 'unsafe-inline' needed for Tailwind CSS
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
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
};

// Conditionally wrap with Sentry if DSN is configured and package is installed
// To enable Sentry:
// 1. Install: npm install @sentry/nextjs
// 2. Set SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN environment variables
// 3. Uncomment the code below and import statement
//
// import { withSentryConfig } from "@sentry/nextjs";
// export default withSentryConfig(nextConfig, {
//   silent: true,
//   org: process.env.SENTRY_ORG,
//   project: process.env.SENTRY_PROJECT,
// });

export default nextConfig;
