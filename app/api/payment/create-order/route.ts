import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";

// ==============================
// TYPES
// ==============================

type PlanName =
  | "Starter"
  | "Professional"
  | "Business";

type BillingCycle =
  | "weekly"
  | "monthly"
  | "quarterly";

// ==============================
// PLAN PRICES
// ==============================

const PLAN_PRICES: Record<
  PlanName,
  Record<BillingCycle, number>
> = {
  Starter: {
    weekly: 149,
    monthly: 499,
    quarterly: 1299,
  },

  Professional: {
    weekly: 299,
    monthly: 999,
    quarterly: 2599,
  },

  Business: {
    weekly: 499,
    monthly: 1999,
    quarterly: 5199,
  },
};

// ==============================
// VALID VALUES
// ==============================

const VALID_PLANS: PlanName[] = [
  "Starter",
  "Professional",
  "Business",
];

const VALID_BILLING_CYCLES: BillingCycle[] = [
  "weekly",
  "monthly",
  "quarterly",
];

// ==============================
// POST
// ==============================

export async function POST(
  request: Request
) {
  try {
    // ==================================================
    // 1. CHECK AUTHORIZATION HEADER
    // ==================================================

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
          error:
            "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization
        .slice(
          "Bearer ".length
        )
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    // ==================================================
    // 2. CHECK SUPABASE ENVIRONMENT VARIABLES
    // ==================================================

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabasePublishableKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (
      !supabaseUrl ||
      !supabasePublishableKey
    ) {
      console.error(
        "Missing Supabase environment variables"
      );

      return NextResponse.json(
        {
          error:
            "Server authentication configuration error",
        },
        {
          status: 500,
        }
      );
    }

    // ==================================================
    // 3. CREATE SERVER-SIDE SUPABASE AUTH CLIENT
    // ==================================================

    const supabase =
      createClient(
        supabaseUrl,
        supabasePublishableKey,
        {
          auth: {
            autoRefreshToken:
              false,

            persistSession:
              false,

            detectSessionInUrl:
              false,
          },
        }
      );

    // ==================================================
    // 4. VERIFY ACCESS TOKEN
    // ==================================================

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
        "Payment authentication error:",
        userError?.message
      );

      return NextResponse.json(
        {
          error:
            "Invalid or expired authentication",
        },
        {
          status: 401,
        }
      );
    }

    // ==================================================
    // 5. RATE LIMIT PAYMENT ORDER CREATION
    // ==================================================
    //
    // Maximum:
    // 5 order-creation requests
    // per user per 60 seconds.
    //
    // This runs BEFORE creating a Razorpay order.

    const rateLimit =
      await checkRateLimit(
        user.id,
        "/api/payment/create-order",
        5,
        60
      );

    if (
      !rateLimit.allowed
    ) {
      console.warn(
        "Payment order rate limit triggered for user:",
        user.id
      );

      return NextResponse.json(
        {
          error:
            rateLimit.error ||
            "Too many payment attempts. Please wait a moment and try again.",
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

    // ==================================================
    // 6. READ REQUEST BODY
    // ==================================================

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body",
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
            "Invalid request body",
        },
        {
          status: 400,
        }
      );
    }

    const requestData =
      body as {
        plan?: unknown;
        billingCycle?: unknown;
      };

    const plan =
      requestData.plan;

    const billingCycle =
      requestData.billingCycle;

    // ==================================================
    // 7. CHECK PLAN
    // ==================================================

    if (
      typeof plan !==
        "string" ||
      !VALID_PLANS.includes(
        plan as PlanName
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid subscription plan",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // 8. CHECK BILLING CYCLE
    // ==================================================

    if (
      typeof billingCycle !==
        "string" ||
      !VALID_BILLING_CYCLES.includes(
        billingCycle as BillingCycle
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid billing cycle",
        },
        {
          status: 400,
        }
      );
    }

    const selectedPlan =
      plan as PlanName;

    const selectedBillingCycle =
      billingCycle as BillingCycle;

    // ==================================================
    // 9. GET SERVER-SIDE PRICE
    // ==================================================

    const price =
      PLAN_PRICES[
        selectedPlan
      ][
        selectedBillingCycle
      ];

    if (
      typeof price !==
        "number" ||
      !Number.isInteger(
        price
      ) ||
      price <= 0
    ) {
      console.error(
        "Invalid server-side payment price:",
        price
      );

      return NextResponse.json(
        {
          error:
            "Invalid payment amount",
        },
        {
          status: 500,
        }
      );
    }

    // ==================================================
    // 10. CHECK RAZORPAY ENVIRONMENT VARIABLES
    // ==================================================

    const razorpayKeyId =
      process.env
        .NEXT_PUBLIC_RAZORPAY_KEY_ID;

    const razorpayKeySecret =
      process.env
        .RAZORPAY_KEY_SECRET;

    if (
      !razorpayKeyId ||
      !razorpayKeySecret
    ) {
      console.error(
        "Missing Razorpay environment variables"
      );

      return NextResponse.json(
        {
          error:
            "Payment service is not configured",
        },
        {
          status: 500,
        }
      );
    }

    // ==================================================
    // 11. CREATE RAZORPAY INSTANCE
    // ==================================================

    const razorpay =
      new Razorpay({
        key_id:
          razorpayKeyId,

        key_secret:
          razorpayKeySecret,
      });

    // ==================================================
    // 12. CREATE UNIQUE RECEIPT
    // ==================================================

    const receipt =
      `bizai_${user.id.slice(
        0,
        8
      )}_${Date.now()}`;

    // ==================================================
    // 13. CREATE RAZORPAY ORDER
    // ==================================================

    const order =
      await razorpay.orders.create({
        amount:
          price * 100,

        currency:
          "INR",

        receipt,

        // Store server-generated information
        // so the payment verification route
        // can associate the order with the user.
        notes: {
          user_id:
            user.id,

          plan:
            selectedPlan,

          billing_cycle:
            selectedBillingCycle,
        },
      });

    // ==================================================
    // 14. SUCCESS RESPONSE
    // ==================================================

    return NextResponse.json({
      success:
        true,

      order,

      plan:
        selectedPlan,

      billingCycle:
        selectedBillingCycle,

      amount:
        price,
    });

  } catch (error) {
    console.error(
      "Create order error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create payment order",
      },
      {
        status: 500,
      }
    );
  }
}