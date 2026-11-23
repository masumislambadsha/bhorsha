import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamic, cookie-authenticated dashboards: cache components would force
  // Suspense boundaries around every layout that reads headers().
  cacheComponents: false,
  partialPrefetching: false,
  // Mongoose and the MongoDB driver must stay external on the Node runtime.
  serverExternalPackages: ["mongoose", "mongodb"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    const base = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)",
      },
      { key: "Content-Security-Policy", value: csp },
    ];

    const production = [
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: process.env.NODE_ENV === "production" ? [...base, ...production] : base,
      },
    ];
  },
};

export default nextConfig;
