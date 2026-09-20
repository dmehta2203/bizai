import { NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";

// ========================================
// PLAN PRICES
// ========================================

const PLAN_PRICES = {
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
} as const;

// ========================================
// BILLING DAYS
// ========================================

const BILLING_DAYS = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
} as const;

// ========================================
// VALID TYPES
// ========================================

type PlanName =
  | "Starter"
  | "Professional"
  | "Business";

type BillingCycle =
  | "weekly"
  | "monthly"
  | "quarterly";

// ========================================
// RAZORPAY RESPONSE TYPES
// ========================================

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  amount_paid?: number;
  currency: string;
  status: string;
  notes?: {
    user_id?: string;
    plan?: string;
    billing_cycle?: string;
  };
};

type RazorpayPaymentResponse = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  captured?: boolean;
  amount_refunded?: number;
};

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
          success: false,
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
        .slice("Bearer ".length)
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    // ====================================
    // 2. CHECK SUPABASE ENVIRONMENT
    // ====================================

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

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
        "Missing Supabase environment variables"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Server authentication configuration error",
        },
        {
          status: 500,
        }
      );
    }

    // ====================================
    // 3. AUTH CLIENT
    // USED ONLY TO VERIFY THE USER TOKEN
    // ====================================

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

    // ====================================
    // 4. VERIFY ACCESS TOKEN
    // ====================================

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAuth.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !user
    ) {
      console.error(
        "Payment verification authentication error:",
        userError?.message
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid or expired authentication",
        },
        {
          status: 401,
        }
      );
    }

    // ====================================
    // 5. RATE LIMIT PAYMENT VERIFICATION
    // 10 REQUESTS / 60 SECONDS
    // ====================================

    const rateLimit =
      await checkRateLimit(
        user.id,
        "/api/payment/verify",
        10,
        60
      );

    if (
      !rateLimit.allowed
    ) {
      console.warn(
        "Payment verification rate limit triggered for user:",
        user.id
      );

      return NextResponse.json(
        {
          success: false,
          error:
            rateLimit.error ||
            "Too many payment verification attempts. Please wait a moment and try again.",
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
    // 6. ADMIN CLIENT
    // SERVER ONLY
    // ====================================

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

    // ====================================
    // 7. CHECK RAZORPAY ENVIRONMENT
    // ====================================

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
          success: false,
          error:
            "Payment service is not configured",
        },
        {
          status: 500,
        }
      );
    }

    // ====================================
    // 8. READ REQUEST BODY
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
          success: false,
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
        razorpay_payment_id?: unknown;
        razorpay_order_id?: unknown;
        razorpay_signature?: unknown;

        // Accepted for frontend
        // compatibility but NOT trusted.
        plan?: unknown;
        billingCycle?: unknown;

        // IMPORTANT:
        // userId is intentionally NOT trusted.
        userId?: unknown;
      };

    const razorpayPaymentId =
      requestData
        .razorpay_payment_id;

    const razorpayOrderId =
      requestData
        .razorpay_order_id;

    const razorpaySignature =
      requestData
        .razorpay_signature;

    // ====================================
    // 9. CHECK PAYMENT IDENTIFIERS
    // ====================================

    if (
      typeof razorpayPaymentId !==
        "string" ||
      typeof razorpayOrderId !==
        "string" ||
      typeof razorpaySignature !==
        "string" ||
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required payment data",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 10. CREATE RAZORPAY INSTANCE
    // ====================================

    const razorpay =
      new Razorpay({
        key_id:
          razorpayKeyId,

        key_secret:
          razorpayKeySecret,
      });

    // ====================================
    // 11. VERIFY RAZORPAY SIGNATURE
    // ====================================

    const bodyToVerify =
      razorpayOrderId +
      "|" +
      razorpayPaymentId;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          razorpayKeySecret
        )
        .update(
          bodyToVerify
        )
        .digest("hex");

    let signatureValid =
      false;

    if (
      razorpaySignature.length ===
      expectedSignature.length
    ) {
      signatureValid =
        crypto.timingSafeEqual(
          Buffer.from(
            expectedSignature,
            "utf8"
          ),
          Buffer.from(
            razorpaySignature,
            "utf8"
          )
        );
    }

    if (
      !signatureValid
    ) {
      console.error(
        "Invalid Razorpay payment signature"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid payment signature",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 12. FETCH ORDER FROM RAZORPAY
    // ====================================

    let razorpayOrder:
      RazorpayOrderResponse;

    try {
      razorpayOrder =
        (await razorpay.orders.fetch(
          razorpayOrderId
        )) as RazorpayOrderResponse;
    } catch (
      error
    ) {
      console.error(
        "Unable to fetch Razorpay order:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify payment order",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 13. VERIFY ORDER ID
    // ====================================

    if (
      razorpayOrder.id !==
      razorpayOrderId
    ) {
      console.error(
        "Razorpay order ID mismatch"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment order mismatch",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 14. VERIFY ORDER OWNER
    // SERVER-GENERATED NOTES
    // ====================================

    const orderUserId =
      razorpayOrder
        .notes
        ?.user_id;

    if (
      !orderUserId ||
      orderUserId !==
        user.id
    ) {
      console.error(
        "Payment order ownership mismatch"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment order does not belong to the authenticated user",
        },
        {
          status: 403,
        }
      );
    }

    // ====================================
    // 15. GET PLAN FROM RAZORPAY ORDER
    // DO NOT TRUST BROWSER PLAN
    // ====================================

    const orderPlan =
      razorpayOrder
        .notes
        ?.plan;

    const orderBillingCycle =
      razorpayOrder
        .notes
        ?.billing_cycle;

    if (
      typeof orderPlan !==
        "string" ||
      typeof orderBillingCycle !==
        "string"
    ) {
      console.error(
        "Missing payment order metadata"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment order information is incomplete",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 16. VALIDATE SERVER-GENERATED PLAN
    // ====================================

    if (
      !Object.prototype.hasOwnProperty.call(
        PLAN_PRICES,
        orderPlan
      )
    ) {
      console.error(
        "Invalid plan in Razorpay order notes"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid subscription plan",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 17. VALIDATE SERVER-GENERATED BILLING
    // ====================================

    if (
      !Object.prototype.hasOwnProperty.call(
        BILLING_DAYS,
        orderBillingCycle
      )
    ) {
      console.error(
        "Invalid billing cycle in Razorpay order notes"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid billing cycle",
        },
        {
          status: 400,
        }
      );
    }

    const validPlan =
      orderPlan as PlanName;

    const validBillingCycle =
      orderBillingCycle as BillingCycle;

    // ====================================
    // 18. GET SERVER-SIDE PRICE
    // ====================================

    const amount =
      PLAN_PRICES[
        validPlan
      ][
        validBillingCycle
      ];

    const expectedAmountInPaise =
      amount * 100;

    // ====================================
    // 19. VERIFY ORDER AMOUNT
    // ====================================

    if (
      razorpayOrder.amount !==
      expectedAmountInPaise
    ) {
      console.error(
        "Razorpay order amount mismatch"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment amount mismatch",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 20. VERIFY ORDER CURRENCY
    // ====================================

    if (
      razorpayOrder.currency !==
      "INR"
    ) {
      console.error(
        "Razorpay order currency mismatch"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported payment currency",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 21. FETCH PAYMENT FROM RAZORPAY
    // ====================================

    let razorpayPayment:
      RazorpayPaymentResponse;

    try {
      razorpayPayment =
        (await razorpay.payments.fetch(
          razorpayPaymentId
        )) as RazorpayPaymentResponse;
    } catch (
      error
    ) {
      console.error(
        "Unable to fetch Razorpay payment:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify payment",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 22. VERIFY PAYMENT ID
    // ====================================

    if (
      razorpayPayment.id !==
      razorpayPaymentId
    ) {
      console.error(
        "Razorpay payment ID mismatch"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment ID mismatch",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 23. VERIFY PAYMENT BELONGS TO ORDER
    // ====================================

    if (
      razorpayPayment.order_id !==
      razorpayOrderId
    ) {
      console.error(
        "Razorpay payment/order mismatch"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment does not belong to this order",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 24. VERIFY PAYMENT AMOUNT
    // ====================================

    if (
      razorpayPayment.amount !==
      expectedAmountInPaise
    ) {
      console.error(
        "Razorpay payment amount mismatch"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment amount mismatch",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 25. VERIFY PAYMENT CURRENCY
    // ====================================

    if (
      razorpayPayment.currency !==
      "INR"
    ) {
      console.error(
        "Razorpay payment currency mismatch"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported payment currency",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 26. PAYMENT MUST BE CAPTURED
    // ====================================

    if (
      razorpayPayment.status !==
        "captured" &&
      razorpayPayment.captured !==
        true
    ) {
      console.error(
        "Payment is not captured:",
        razorpayPayment.status
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment has not been captured yet",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 27. DO NOT ACCEPT REFUNDED PAYMENT
    // ====================================

    if (
      typeof razorpayPayment.amount_refunded ===
        "number" &&
      razorpayPayment.amount_refunded >
        0
    ) {
      console.error(
        "Payment has been refunded"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment has already been refunded",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 28. PREVENT DUPLICATE PAYMENT
    // ====================================

    const {
      data: existingPayment,
      error:
        paymentCheckError,
    } =
      await supabase
        .from("payment_receipts")
        .select(
          "id, receipt_number, user_id"
        )
        .eq(
          "payment_id",
          razorpayPaymentId
        )
        .maybeSingle();

    if (
      paymentCheckError
    ) {
      console.error(
        "Payment check error:",
        paymentCheckError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check payment history",
        },
        {
          status: 500,
        }
      );
    }

    // ====================================
    // 29. HANDLE EXISTING PAYMENT
    // ====================================

    if (
      existingPayment
    ) {
      // Existing payment belongs to another
      // account. Do not reveal its details.
      if (
        existingPayment.user_id !==
        user.id
      ) {
        console.error(
          "Existing payment belongs to another user"
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment has already been processed",
          },
          {
            status: 409,
          }
        );
      }

      console.log(
        "Duplicate payment prevented"
      );

      return NextResponse.json({
        success: true,

        message:
          "Payment already processed",

        duplicate:
          true,

        receipt: {
          id:
            existingPayment.id,

          receipt_number:
            existingPayment.receipt_number,
        },
      });
    }

    // ====================================
    // 30. SUBSCRIPTION DATES
    // ====================================

    const startDate =
      new Date();

    const subscriptionDays =
      BILLING_DAYS[
        validBillingCycle
      ];

    const expiryDate =
      new Date();

    expiryDate.setDate(
      expiryDate.getDate() +
      subscriptionDays
    );

    // ====================================
    // 31. CHECK CURRENT SUBSCRIPTION
    // ====================================

    const {
      data: existingSubscription,
      error:
        subscriptionError,
    } =
      await supabase
        .from("subscriptions")
        .select("id")
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "active"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (
      subscriptionError
    ) {
      console.error(
        "Subscription check error:",
        subscriptionError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check current subscription",
        },
        {
          status: 500,
        }
      );
    }

    // ====================================
    // 32. UPDATE CURRENT SUBSCRIPTION
    // ====================================

    if (
      existingSubscription
    ) {
      const {
        error:
          updateError,
      } =
        await supabase
          .from("subscriptions")
          .update({
            plan:
              validPlan,

            amount:
              amount,

            status:
              "active",

            billing_cycle:
              validBillingCycle,

            current_period_start:
              startDate.toISOString(),

            current_period_end:
              expiryDate.toISOString(),

            razorpay_subscription_id:
              razorpayOrderId,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            existingSubscription.id
          );

      if (
        updateError
      ) {
        console.error(
          "Subscription update error:",
          updateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to update subscription",
          },
          {
            status: 500,
          }
        );
      }

      console.log(
        "Subscription updated for authenticated user"
      );
    } else {
      // ==================================
      // 33. CREATE SUBSCRIPTION
      // ==================================

      const {
        error:
          insertError,
      } =
        await supabase
          .from("subscriptions")
          .insert([
            {
              user_id:
                user.id,

              plan:
                validPlan,

              amount:
                amount,

              status:
                "active",

              billing_cycle:
                validBillingCycle,

              razorpay_customer_id:
                null,

              razorpay_subscription_id:
                razorpayOrderId,

              current_period_start:
                startDate.toISOString(),

              current_period_end:
                expiryDate.toISOString(),

              updated_at:
                new Date().toISOString(),
            },
          ]);

      if (
        insertError
      ) {
        console.error(
          "Subscription insert error:",
          insertError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to create subscription",
          },
          {
            status: 500,
          }
        );
      }

      console.log(
        "New subscription created for authenticated user"
      );
    }

    // ====================================
    // 34. GENERATE RECEIPT NUMBER
    // ====================================

    const receiptNumber =
      `BIZAI-${Date.now()}-${crypto.randomInt(
        100000,
        1000000
      )}`;

    // ====================================
    // 35. SAVE PAYMENT RECEIPT
    // ====================================

    const {
      data: receipt,
      error:
        receiptError,
    } =
      await supabase
        .from("payment_receipts")
        .insert([
          {
            user_id:
              user.id,

            receipt_number:
              receiptNumber,

            plan:
              validPlan,

            amount:
              amount,

            payment_id:
              razorpayPaymentId,

            order_id:
              razorpayOrderId,

            payment_status:
              "Paid",

            billing_cycle:
              validBillingCycle,

            payment_date:
              startDate.toISOString(),

            subscription_start:
              startDate.toISOString(),

            subscription_end:
              expiryDate.toISOString(),
          },
        ])
        .select()
        .single();

    if (
      receiptError
    ) {
      console.error(
        "Receipt creation error:",
        receiptError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment successful but receipt could not be saved",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "Payment receipt created successfully"
    );

    // ====================================
    // 36. SUCCESS RESPONSE
    // ====================================

    return NextResponse.json({
      success: true,

      message:
        "Payment verified successfully!",

      plan:
        validPlan,

      billingCycle:
        validBillingCycle,

      amount:
        amount,

      subscriptionDays:
        subscriptionDays,

      currentPeriodStart:
        startDate.toISOString(),

      currentPeriodEnd:
        expiryDate.toISOString(),

      receipt:
        receipt,
    });

  } catch (error) {
    console.error(
      "Payment verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Payment verification failed",
      },
      {
        status: 500,
      }
    );
  }
}