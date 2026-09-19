import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ========================================
// POST
// ========================================

export async function POST(
  request: NextRequest
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
          success: false,
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
          success: false,
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    // ====================================
    // 2. SUPABASE CONFIGURATION
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
          success: false,
          error:
            "Server authentication configuration error.",
        },
        {
          status: 500,
        }
      );
    }

    // ====================================
    // 3. CREATE AUTH CLIENT
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
    // 4. VERIFY USER
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
        "WhatsApp authentication error:",
        userError?.message
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid or expired authentication.",
        },
        {
          status: 401,
        }
      );
    }

    // ====================================
    // 5. READ REQUEST BODY
    // ====================================

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
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
          success: false,
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
        phone?: unknown;
        message?: unknown;
      };

    // ====================================
    // 6. VALIDATE PHONE
    // ====================================

    if (
      typeof requestData.phone !==
        "string" ||
      !requestData.phone.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Phone number is required.",
        },
        {
          status: 400,
        }
      );
    }

    let normalizedPhone =
      requestData.phone.replace(
        /\D/g,
        ""
      );

    // Remove leading zero for Indian
    // local numbers.
    if (
      normalizedPhone.startsWith(
        "0"
      )
    ) {
      normalizedPhone =
        normalizedPhone.substring(
          1
        );
    }

    // Add India country code for
    // standard 10-digit numbers.
    if (
      normalizedPhone.length ===
      10
    ) {
      normalizedPhone =
        "91" +
        normalizedPhone;
    }

    // ====================================
    // 7. VALIDATE FINAL PHONE
    // ====================================

    if (
      !/^[1-9][0-9]{9,14}$/.test(
        normalizedPhone
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please provide a valid phone number.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 8. VALIDATE MESSAGE
    // ====================================

    if (
      typeof requestData.message !==
        "string" ||
      !requestData.message.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const message =
      requestData.message.trim();

    if (
      message.length >
      5000
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Message is too long.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 9. CREATE WHATSAPP URL
    // ====================================

    const whatsappUrl =
      `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(
        message
      )}`;

    // ====================================
    // 10. SUCCESS
    // ====================================

    return NextResponse.json({
      success: true,
      whatsappUrl,
    });
  } catch (error) {
    console.error(
      "WhatsApp API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid WhatsApp request.",
      },
      {
        status: 400,
      }
    );
  }
}