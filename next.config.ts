import type { NextConfig } from "next";

const localPatterns = [
  {
    pathname: "/api/places/photo",
  },
];

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

const remotePatterns = [
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
    remotePatterns.push({
      protocol: protocol.replace(":", ""),
      hostname,
      port: port || undefined,
      pathname: "/api/places/photo",
    });
  } catch {
    // ignore invalid NEXT_PUBLIC_SITE_URL
  }
}

const nextConfig: NextConfig = {
  images: {
    localPatterns,
    remotePatterns,
  },
};

export default nextConfig;
