import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const localPatterns = [
  {
    pathname: "/api/places/photo",
  },
  {
    pathname: "/images/regions/**",
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
    hostname: "images.pexels.com",
  },
  {
    protocol: "https",
    hostname: "cdn.pixabay.com",
  },
  {
    protocol: "https",
    hostname: "cdn.sanity.io",
  },
  {
    protocol: "https",
    hostname: "mbjcxrfuuczlauavashs.supabase.co",
    pathname: "/storage/v1/object/public/**",
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
// In production, Next.js uses nonce-based CSP automatically, but we still need 'unsafe-inline' as fallback
// Consider using 'strict-dynamic' with nonces in the future for better security
const scriptSrc = isProduction
  ? ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://vercel.live", "https://va.vercel-scripts.com"] // Production: allow inline for Next.js hydration + unpkg.com for Leaflet + Vercel
  : ["'self'", "'unsafe-eval'", "'unsafe-inline'", "https://unpkg.com", "https://vercel.live"]; // Development: allow for Next.js hot reload + unpkg.com

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
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc.join(" ")}`, // Allow inline scripts for Next.js hydration
      "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com", // Allow Google Fonts stylesheets + Tailwind CSS inline styles
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com", // Allow Google Fonts
      "connect-src 'self' https://*.supabase.co https://*.googleapis.com https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://*.vercel-insights.com https://vitals.vercel-insights.com https://*.sanity.io https://*.apicdn.sanity.io",
      "worker-src 'self' blob:", // Allow Mapbox GL JS Web Workers
      "frame-src 'self' https://*.sanity.io",
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
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400, // 24 hours — prevents frequent re-optimization
    // Skip image optimization proxy in dev — avoids timeout cascade when
    // Turbopack compilation blocks the event loop for 10-30s
    unoptimized: !isProduction,
  },
  async headers() {
    // Sanity Studio requires 'unsafe-eval' for script execution
    const studioScriptSrc = ["'self'", "'unsafe-eval'", "'unsafe-inline'", "https://unpkg.com", "https://vercel.live", "https://va.vercel-scripts.com"];
    const studioHeaders = securityHeaders.map((header) => {
      if (header.key === "Content-Security-Policy") {
        return {
          ...header,
          value: header.value
            .replace(`script-src ${scriptSrc.join(" ")}`, `script-src ${studioScriptSrc.join(" ")}`)
            .replace("frame-ancestors 'self'", "frame-ancestors 'self' https://*.sanity.io"),
        };
      }
      return header;
    });

    return [
      {
        source: "/studio/:path*",
        headers: studioHeaders,
      },
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
};

// Compose config wrappers: bundle analyzer -> sentry
const configWithAnalyzer = withBundleAnalyzer(nextConfig);

export default withSentryConfig(configWithAnalyzer, {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Only upload source maps in production
  silent: process.env.NODE_ENV !== "production",

  // Configure source maps settings
  sourcemaps: {
    // Hides source maps from generated client bundles
    deleteSourcemapsAfterUpload: true,
  },

  // Webpack-specific options (not supported with Turbopack)
  webpack: {
    // Automatically tree-shake Sentry logger statements
    treeshake: {
      removeDebugLogging: true,
    },
    // Automatically instrument Next.js data fetching methods
    automaticVercelMonitors: true,
  },
});
