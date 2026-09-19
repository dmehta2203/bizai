import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    // 5. CHECK OPENAI CONFIGURATION
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

    const openai =
      new OpenAI({
        apiKey:
          openAIKey,
      });

    // ====================================
    // 6. READ REQUEST BODY
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
    // 7. VALIDATE CUSTOMER NAME
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
    // 8. VALIDATE BUSINESS NAME
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
    // 9. VALIDATE PURPOSE
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
    // 10. GENERATE EMAIL
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
    // 11. CHECK AI RESPONSE
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
    // 12. SUCCESS
    // ====================================

    return NextResponse.json({
      message:
        emailMessage,
    });
  } catch (error) {
    console.error(
      "AI Email Generation Error:",
      error
    );

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