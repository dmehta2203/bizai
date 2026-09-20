import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";

// ========================================
// HTML ESCAPE
// Prevent customer/user text from injecting
// arbitrary HTML into the email body.
// ========================================

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ========================================
// BASIC EMAIL VALIDATION
// ========================================

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

// ========================================
// POST
// ========================================

export async function POST(
  request: Request
) {
  try {
    // ====================================
    // 1. CHECK AUTHORIZATION HEADER
    // ====================================

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization
        .slice("Bearer ".length)
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    // ====================================
    // 2. CHECK SUPABASE CONFIGURATION
    // ====================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabasePublishableKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (
      !supabaseUrl ||
      !supabasePublishableKey
    ) {
      console.error(
        "Missing Supabase environment variables."
      );

      return NextResponse.json(
        {
          error:
            "Server authentication configuration error.",
        },
        {
          status: 500,
        }
      );
    }

    // ====================================
    // 3. CREATE SERVER AUTH CLIENT
    // ====================================

    const supabase =
      createClient(
        supabaseUrl,
        supabasePublishableKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        }
      );

    // ====================================
    // 4. VERIFY AUTHENTICATED USER
    // ====================================

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !user
    ) {
      console.error(
        "Email authentication error:",
        userError?.message
      );

      return NextResponse.json(
        {
          error:
            "Invalid or expired authentication.",
        },
        {
          status: 401,
        }
      );
    }

    // ====================================
    // 5. TRUST ONLY VERIFIED USER ID
    // ====================================

    const authenticatedUserId =
      user.id;

    console.log(
      "Authenticated email request from user:",
      authenticatedUserId
    );

    // ====================================
    // 6. RATE LIMIT
    // 20 REQUESTS / 60 SECONDS
    // ====================================

    const rateLimit =
      await checkRateLimit(
        authenticatedUserId,
        "/api/send-email",
        20,
        60
      );

    if (
      !rateLimit.allowed
    ) {
      console.warn(
        "Send Email rate limit triggered for user:",
        authenticatedUserId
      );

      return NextResponse.json(
        {
          error:
            rateLimit.error ||
            "Too many email requests. Please wait a moment and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              "60",
          },
        }
      );
    }

    // ====================================
    // 7. CHECK RESEND API KEY
    // ====================================

    const resendApiKey =
      process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error(
        "Missing RESEND_API_KEY."
      );

      return NextResponse.json(
        {
          error:
            "Email service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const resend =
      new Resend(
        resendApiKey
      );

    // ====================================
    // 8. READ REQUEST BODY SAFELY
    // ====================================

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const requestData =
      body as {
        to?: unknown;
        subject?: unknown;
        message?: unknown;
        customerName?: unknown;
      };

    // ====================================
    // 9. VALIDATE TO
    // ====================================

    const to =
      requestData.to;

    if (
      typeof to !== "string" ||
      !to.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Customer email is required.",
        },
        {
          status: 400,
        }
      );
    }

    const trimmedTo =
      to.trim();

    if (
      !isValidEmail(
        trimmedTo
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Please provide a valid customer email address.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 10. VALIDATE SUBJECT
    // ====================================

    const subject =
      requestData.subject;

    if (
      typeof subject !== "string" ||
      !subject.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Email subject is required.",
        },
        {
          status: 400,
        }
      );
    }

    const trimmedSubject =
      subject.trim();

    if (
      trimmedSubject.length >
      200
    ) {
      return NextResponse.json(
        {
          error:
            "Email subject is too long.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 11. VALIDATE MESSAGE
    // ====================================

    const message =
      requestData.message;

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Email message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const trimmedMessage =
      message.trim();

    if (
      trimmedMessage.length >
      10000
    ) {
      return NextResponse.json(
        {
          error:
            "Email message is too long.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 12. VALIDATE CUSTOMER NAME
    // ====================================

    let safeCustomerName =
      "";

    if (
      typeof requestData.customerName ===
      "string"
    ) {
      const trimmedCustomerName =
        requestData.customerName.trim();

      if (
        trimmedCustomerName.length >
        200
      ) {
        return NextResponse.json(
          {
            error:
              "Customer name is too long.",
          },
          {
            status: 400,
          }
        );
      }

      safeCustomerName =
        escapeHtml(
          trimmedCustomerName
        );
    }

    // ====================================
    // 13. ESCAPE MESSAGE
    // ====================================

    const safeMessage =
      escapeHtml(
        trimmedMessage
      );

    // ====================================
    // 14. BUILD EMAIL HTML
    // ====================================

    const greeting =
      safeCustomerName
        ? `
            <p>
              Hello <strong>${safeCustomerName}</strong>,
            </p>
          `
        : "";

    const html = `
      <div
        style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 30px;
          background: #ffffff;
          color: #1e293b;
        "
      >

        <h2
          style="
            color: #7c3aed;
          "
        >
          🤖 BizAI Employee
        </h2>

        <hr
          style="
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 20px 0;
          "
        />

        ${greeting}

        <div
          style="
            white-space: pre-wrap;
            line-height: 1.7;
            font-size: 16px;
          "
        >
          ${safeMessage}
        </div>

        <br />

        <hr
          style="
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 20px 0;
          "
        />

        <p
          style="
            color: #64748b;
            font-size: 13px;
          "
        >
          Sent using BizAI Employee
        </p>

      </div>
    `;

    // ====================================
    // 15. SEND EMAIL
    // ====================================

    const {
      data,
      error,
    } =
      await resend.emails.send({
        from:
          "BizAI Employee <onboarding@resend.dev>",

        to: [
          trimmedTo,
        ],

        subject:
          trimmedSubject,

        html,
      });

    // ====================================
    // 16. RESEND ERROR
    // ====================================

    if (error) {
      console.error(
        "Resend Error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to send email.",
        },
        {
          status: 500,
        }
      );
    }

    // ====================================
    // 17. SUCCESS
    // ====================================

    return NextResponse.json(
      {
        success: true,

        message:
          "Email sent successfully!",

        data,
      },
      {
        status: 200,
      }
    );

  } catch (error) {
    console.error(
      "Send Email Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while sending the email.",
      },
      {
        status: 500,
      }
    );
  }
}