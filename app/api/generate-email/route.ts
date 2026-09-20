import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";

// ========================================
// POST
// ========================================

export async function POST(request: Request) {
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
    // 4. VERIFY ACCESS TOKEN
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
        "AI email authentication error:",
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

    const userId =
      user.id;

    // ====================================
    // 6. RATE LIMIT
    // 20 REQUESTS / 60 SECONDS
    // ====================================

    const rateLimit =
      await checkRateLimit(
        userId,
        "/api/generate-email",
        20,
        60
      );

    if (
      !rateLimit.allowed
    ) {
      console.warn(
        "Generate Email rate limit triggered for user:",
        userId
      );

      return NextResponse.json(
        {
          error:
            rateLimit.error ||
            "Too many AI requests. Please wait a moment and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
          },
        }
      );
    }

    // ====================================
    // 7. CHECK OPENAI CONFIGURATION
    // ====================================

    const openAIKey =
      process.env.OPENAI_API_KEY;

    if (!openAIKey) {
      console.error(
        "Missing OPENAI_API_KEY."
      );

      return NextResponse.json(
        {
          error:
            "AI service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    // ====================================
    // 8. CREATE OPENAI CLIENT
    // ====================================

    const openai =
      new OpenAI({
        apiKey:
          openAIKey,
      });

    // ====================================
    // 9. READ REQUEST BODY
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
        customerName?: unknown;
        businessName?: unknown;
        purpose?: unknown;
      };

    // ====================================
    // 10. VALIDATE CUSTOMER NAME
    // ====================================

    const customerName =
      requestData.customerName;

    if (
      typeof customerName !== "string" ||
      !customerName.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Customer name is required.",
        },
        {
          status: 400,
        }
      );
    }

    const trimmedCustomerName =
      customerName.trim();

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

    // ====================================
    // 11. VALIDATE BUSINESS NAME
    // ====================================

    let trimmedBusinessName =
      "Not provided";

    if (
      typeof requestData.businessName ===
      "string"
    ) {
      const businessName =
        requestData.businessName.trim();

      if (
        businessName.length >
        200
      ) {
        return NextResponse.json(
          {
            error:
              "Business name is too long.",
          },
          {
            status: 400,
          }
        );
      }

      if (businessName) {
        trimmedBusinessName =
          businessName;
      }
    }

    // ====================================
    // 12. VALIDATE PURPOSE
    // ====================================

    const purpose =
      requestData.purpose;

    if (
      typeof purpose !== "string" ||
      !purpose.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Email purpose is required.",
        },
        {
          status: 400,
        }
      );
    }

    const trimmedPurpose =
      purpose.trim();

    if (
      trimmedPurpose.length >
      5000
    ) {
      return NextResponse.json(
        {
          error:
            "Email purpose is too long.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 13. GENERATE EMAIL
    // ====================================

    const response =
      await openai.responses.create({
        model:
          "gpt-5.6-luna",

        instructions: `
You are BizAI Employee, an intelligent AI business assistant
for Indian businesses.

Write a professional, friendly and concise business email.

Rules:
- Write only the email content.
- Do not include a subject line.
- Address the customer naturally.
- Keep the email professional and easy to understand.
- Do not use markdown.
- End with a professional closing.
        `,

        input: `
Customer Name: ${trimmedCustomerName}

Customer Business: ${trimmedBusinessName}

Purpose of Email:
${trimmedPurpose}
        `,
      });

    // ====================================
    // 14. CHECK AI RESPONSE
    // ====================================

    const emailMessage =
      response.output_text?.trim();

    if (!emailMessage) {
      console.error(
        "OpenAI returned an empty email response."
      );

      return NextResponse.json(
        {
          error:
            "The AI could not generate an email.",
        },
        {
          status: 500,
        }
      );
    }

    // ====================================
    // 15. SUCCESS
    // ====================================

    return NextResponse.json({
      message:
        emailMessage,
    });

  } catch (error: any) {
    // ====================================
    // ERROR LOG
    // ====================================

    console.error(
      "AI Email Generation Error:",
      error
    );

    // ====================================
    // OPENAI RATE LIMIT / QUOTA
    // ====================================

    if (
      error?.status ===
      429
    ) {
      return NextResponse.json(
        {
          error:
            "AI service is temporarily unavailable because the API quota or credits have been exhausted. Please add OpenAI API credits and try again.",
        },
        {
          status: 429,
        }
      );
    }

    // ====================================
    // OPENAI AUTH ERROR
    // ====================================

    if (
      error?.status ===
      401
    ) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is invalid or missing.",
        },
        {
          status: 500,
        }
      );
    }

    // ====================================
    // GENERAL ERROR
    // ====================================

    return NextResponse.json(
      {
        error:
          "Unable to generate email.",
      },
      {
        status: 500,
      }
    );
  }
}