import type { NextConfig } from "next";

// =========================================================
// SUPABASE ORIGIN
// =========================================================

let supabaseOrigin = "";
let supabaseWebSocketOrigin = "";

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const supabaseUrl = new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL
    );

    supabaseOrigin = supabaseUrl.origin;
    supabaseWebSocketOrigin = `wss://${supabaseUrl.host}`;
  } catch {
    console.warn(
      "Invalid NEXT_PUBLIC_SUPABASE_URL."
    );
  }
}

// =========================================================
// CONTENT SECURITY POLICY
// =========================================================

const contentSecurityPolicy = [
  "default-src 'self'",

  "base-uri 'self'",

  "object-src 'none'",

  "frame-ancestors 'none'",

  // Allow normal BizAI forms only.
  "form-action 'self'",

  // Next.js + Razorpay Checkout + Razorpay CDN.
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://cdn.razorpay.com",

  // Current Next.js rendering.
  "style-src 'self' 'unsafe-inline'",

  // Application images + Razorpay images.
  "img-src 'self' data: blob: https:",

  // Fonts.
  "font-src 'self' data: https:",

  // Razorpay Checkout can use both checkout.razorpay.com
  // and api.razorpay.com frames.
  "frame-src https://checkout.razorpay.com https://api.razorpay.com",

  // Supabase + Razorpay browser communication.
  `connect-src 'self' ${supabaseOrigin} ${supabaseWebSocketOrigin} https://*.supabase.co https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com https://*.razorpay.com wss://*.supabase.co`,

  // Application media.
  "media-src 'self' blob:",

  // Workers.
  "worker-src 'self' blob:",

  // Same-origin manifest.
  "manifest-src 'self'",
].join("; ");

// =========================================================
// SECURITY HEADERS
// =========================================================

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },

  {
    key: "X-Frame-Options",
    value: "DENY",
  },

  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },

  {
    key: "Permissions-Policy",
    value:
      'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")',
  },

  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },

  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
];

// =========================================================
// PRODUCTION-ONLY SECURITY HEADERS
// =========================================================

const productionHeaders = [
  ...securityHeaders,

  {
    key: "Strict-Transport-Security",
    value:
      "max-age=63072000; includeSubDomains; preload",
  },
];

// =========================================================
// NEXT CONFIG
// =========================================================

const nextConfig: NextConfig = {
  async headers() {
    const isProduction =
      process.env.NODE_ENV === "production";

    return [
      {
        source: "/(.*)",
        headers: isProduction
          ? productionHeaders
          : [],
      },
    ];
  },
};

export default nextConfig;