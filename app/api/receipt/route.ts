import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";

// ========================================
// HELPERS
// ========================================

function isValidUUID(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

// ========================================
// GET RECEIPTS
//
// GET /api/receipt
//     -> returns all receipts for the
//        authenticated user
//
// GET /api/receipt?id=<receipt-id>
//     -> returns one receipt belonging
//        to the authenticated user
// ========================================

export async function GET(
  request: NextRequest
) {
  try {
    // ======================================
    // 1. CHECK SUPABASE CONFIGURATION
    // ======================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabasePublishableKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const supabaseServiceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !supabasePublishableKey ||
      !supabaseServiceRoleKey
    ) {
      console.error(
        "Missing Supabase environment variables."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Server configuration error.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // ======================================
    // 2. AUTHORIZATION HEADER
    // ======================================

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // ======================================
    // 3. ACCESS TOKEN
    // ======================================

    const accessToken =
      authorization
        .slice(
          "Bearer ".length
        )
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication token is missing.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // ======================================
    // 4. AUTH CLIENT
    // ======================================
    //
    // Publishable key is used to verify
    // the user's access token.
    //
    // Service role is NOT used for auth.
    // It is only used after the user has
    // been verified.

    const supabaseAuth =
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

    // ======================================
    // 5. VERIFY USER
    // ======================================

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabaseAuth.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !user
    ) {
      console.error(
        "Receipt authentication error:",
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
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // ======================================
    // 6. VERIFIED USER ID
    // ======================================

    const userId =
      user.id;

    // ======================================
    // 7. RATE LIMIT
    // 20 REQUESTS / 60 SECONDS
    // ======================================

    const rateLimit =
      await checkRateLimit(
        userId,
        "/api/receipt",
        20,
        60
      );

    if (
      !rateLimit.allowed
    ) {
      console.warn(
        "Receipt API rate limit triggered for user:",
        userId
      );

      return NextResponse.json(
        {
          success: false,
          error:
            rateLimit.error ||
            "Too many receipt requests. Please wait a moment and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              "60",
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // ======================================
    // 8. SERVER-ONLY SUPABASE CLIENT
    // ======================================

    const supabase =
      createClient(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        }
      );

    // ======================================
    // 9. GET OPTIONAL RECEIPT ID
    // ======================================

    const receiptId =
      request.nextUrl.searchParams.get(
        "id"
      );

    // ======================================
    // 10. FETCH ONE RECEIPT
    // ======================================

    if (receiptId) {
      // ====================================
      // VALIDATE RECEIPT ID
      // ====================================

      if (
        !isValidUUID(
          receiptId
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid receipt ID.",
          },
          {
            status: 400,
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        );
      }

      // ====================================
      // IMPORTANT OWNERSHIP CHECK
      // ====================================
      //
      // The authenticated user ID is always
      // applied to the query.
      //
      // A user cannot request another user's
      // receipt simply by changing the ID.

      const {
        data: receipt,
        error,
      } =
        await supabase
          .from(
            "payment_receipts"
          )
          .select("*")
          .eq(
            "id",
            receiptId
          )
          .eq(
            "user_id",
            userId
          )
          .maybeSingle();

      if (error) {
        console.error(
          "Receipt lookup error:",
          error.message
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to load receipt.",
          },
          {
            status: 500,
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        );
      }

      if (!receipt) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Receipt not found.",
          },
          {
            status: 404,
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        );
      }

      // ====================================
      // RETURN SINGLE RECEIPT
      // ====================================

      return NextResponse.json(
        {
          success: true,
          receipt,
        },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // ======================================
    // 11. FETCH ALL USER RECEIPTS
    // ======================================

    const {
      data: receipts,
      error:
        receiptsError,
    } =
      await supabase
        .from(
          "payment_receipts"
        )
        .select("*")
        .eq(
          "user_id",
          userId
        )
        .order(
          "payment_date",
          {
            ascending:
              false,
          }
        );

    if (
      receiptsError
    ) {
      console.error(
        "Receipt list error:",
        receiptsError.message
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load receipts.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // ======================================
    // 12. SUCCESS
    // ======================================

    return NextResponse.json(
      {
        success:
          true,

        receipts:
          receipts || [],
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );

  } catch (error) {
    console.error(
      "Receipt API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to process receipt request.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}

// ========================================
// BLOCK POST
//
// Receipt records must NOT be created by
// the browser.
//
// They are created by the verified payment
// flow on the server.
// ========================================

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Receipt creation is not available through the public API.",
    },
    {
      status: 405,
      headers: {
        Allow: "GET",
        "Cache-Control":
          "no-store",
      },
    }
  );
}