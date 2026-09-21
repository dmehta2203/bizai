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
// Compatibility-focused CSP for BizAI.
//
// Razorpay Checkout requires checkout.razorpay.com
// and may load supporting security/risk scripts from
// cdn.razorpay.com.
//
// We keep the CSP enabled rather than disabling it.
//

const contentSecurityPolicy = [
  "default-src 'self'",

  "base-uri 'self'",

  "object-src 'none'",

  "frame-ancestors 'none'",

  "form-action 'self'",

  // Next.js application scripts + Razorpay Checkout
  // + Razorpay supporting CDN scripts.
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://cdn.razorpay.com",

  // Current application rendering compatibility.
  "style-src 'self' 'unsafe-inline'",

  // Application images + remote image resources.
  "img-src 'self' data: blob: https:",

  // Local fonts and remote fonts if required.
  "font-src 'self' data: https:",

  // Razorpay Checkout iframe.
  "frame-src https://checkout.razorpay.com",

  // Supabase browser API + Realtime WebSocket
  // + Razorpay browser APIs.
  `connect-src 'self' ${supabaseOrigin} ${supabaseWebSocketOrigin} https://*.supabase.co https://*.razorpay.com wss://*.supabase.co`,

  // Application media.
  "media-src 'self' blob:",

  // Workers from current origin.
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

  // Razorpay checkout uses payment popups.
  // Allow the popup relationship without
  // disabling the rest of our security policy.
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