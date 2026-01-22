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
      "connect-src 'self' https://*.supabase.co https://*.googleapis.com https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://*.vercel-insights.com https://vitals.vercel-insights.com",
      "worker-src 'self' blob:", // Allow Mapbox GL JS Web Workers
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
};

export default nextConfig;
