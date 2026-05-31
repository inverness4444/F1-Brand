import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const noIndexHeader = { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" };

function canonicalSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    return null;
  }

  try {
    const url = new URL(siteUrl);

    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function buildContentSecurityPolicy() {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    middlewareClientMaxBodySize: "64mb",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [48, 64, 96, 128, 256, 384],
    qualities: [75, 82],
    minimumCacheTTL: 2_592_000,
  },
  poweredByHeader: false,
  async headers() {
    const headers = [
      { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    ];

    if (!isDevelopment) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/:path*",
        headers,
      },
      {
        source: "/api/:path*",
        headers: [noIndexHeader],
      },
      {
        source: "/admin/:path*",
        headers: [noIndexHeader],
      },
      {
        source: "/account/:path*",
        headers: [noIndexHeader],
      },
      {
        source: "/checkout/:path*",
        headers: [noIndexHeader],
      },
      {
        source: "/login",
        headers: [noIndexHeader],
      },
      {
        source: "/register",
        headers: [noIndexHeader],
      },
      {
        source: "/forgot-password",
        headers: [noIndexHeader],
      },
    ];
  },
  async redirects() {
    const canonicalUrl = canonicalSiteUrl();
    const routeRedirects = [
      {
        source: "/catalog",
        destination: "/shop",
        permanent: true,
      },
      {
        source: "/new-drops",
        destination: "/new",
        permanent: true,
      },
      {
        source: "/men",
        destination: "/shop",
        permanent: true,
      },
      {
        source: "/women",
        destination: "/shop",
        permanent: true,
      },
    ];

    if (!canonicalUrl) {
      return routeRedirects;
    }

    const canonicalHost = canonicalUrl.host;
    const alternateHost = canonicalUrl.hostname.startsWith("www.")
      ? canonicalUrl.host.replace(/^www\./, "")
      : `www.${canonicalUrl.host}`;

    if (alternateHost === canonicalHost) {
      return routeRedirects;
    }

    return [
      ...routeRedirects,
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: alternateHost,
          },
        ],
        destination: `${canonicalUrl.protocol}//${canonicalHost}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
