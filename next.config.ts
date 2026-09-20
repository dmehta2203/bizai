import type { NextConfig } from "next";

// =========================================================
// SUPABASE ORIGIN
// =========================================================

let supabaseOrigin = "";
let supabaseWebSocketOrigin = "";

if (
  process.env.NEXT_PUBLIC_SUPABASE_URL
) {
  try {
    const supabaseUrl = new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL
    );

    supabaseOrigin =
      supabaseUrl.origin;

    supabaseWebSocketOrigin =
      `wss://${supabaseUrl.host}`;
  } catch {
    console.warn(
      "Invalid NEXT_PUBLIC_SUPABASE_URL."
    );
  }
}

// =========================================================
// CONTENT SECURITY POLICY
// =========================================================
//
// This is a compatibility-focused production CSP.
//
// Next.js supports nonce-based CSP for stricter
// environments, but that requires request-time
// middleware/dynamic rendering. We are first adding
// a stable CSP that works with the current BizAI
// architecture and Razorpay checkout.
// =========================================================

const contentSecurityPolicy = [
  "default-src 'self'",

  "base-uri 'self'",

  "object-src 'none'",

  "frame-ancestors 'none'",

  "form-action 'self'",

  // Next.js application scripts + Razorpay Checkout.
  //
  // unsafe-inline is retained for compatibility with
  // the current Next.js client rendering setup.
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",

  // Tailwind/Next.js styles and current application
  // rendering require inline style compatibility.
  "style-src 'self' 'unsafe-inline'",

  // Application images + remote image resources.
  "img-src 'self' data: blob: https:",

  // Local fonts and remote fonts if needed.
  "font-src 'self' data: https:",

  // Razorpay Checkout popup/iframe.
  "frame-src https://checkout.razorpay.com",

  // Supabase browser API + Realtime WebSocket +
  // Razorpay browser API.
  `connect-src 'self' ${supabaseOrigin} ${supabaseWebSocketOrigin} https://*.supabase.co https://*.razorpay.com wss://*.supabase.co`,

  // Allow media used by the application.
  "media-src 'self' blob:",

  // Allow workers from the current origin.
  "worker-src 'self' blob:",

  // Allow a same-origin manifest.
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
    value:
      "strict-origin-when-cross-origin",
  },

  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },

  {
    key: "Content-Security-Policy",
    value:
      contentSecurityPolicy,
  },

  // Allow payment popups while keeping
  // the application protected from
  // unwanted cross-origin opener access.
  {
    key:
      "Cross-Origin-Opener-Policy",
    value:
      "same-origin-allow-popups",
  },
];

// =========================================================
// PRODUCTION-ONLY SECURITY HEADERS
// =========================================================

const productionHeaders = [
  ...securityHeaders,

  {
    key:
      "Strict-Transport-Security",
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
      process.env.NODE_ENV ===
      "production";

    return [
      {
        source:
          "/(.*)",

        headers:
          isProduction
            ? productionHeaders
            : [],
      },
    ];
  },
};

export default nextConfig;