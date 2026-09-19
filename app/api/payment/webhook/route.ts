import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

// ========================================
// TYPES
// ========================================

type PlanName =
  | "Starter"
  | "Professional"
  | "Business";

type BillingCycle =
  | "weekly"
  | "monthly"
  | "quarterly";

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: {
    user_id?: string;
    plan?: string;
    billing_cycle?: string;
  };
};

type RazorpayPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  captured?: boolean;
  amount_refunded?: number;
};

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
// POST WEBHOOK
// ========================================

export async function POST(
  request: NextRequest
) {
  try {
    // ====================================
    // 1. GET WEBHOOK SECRET
    // ====================================

    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "Missing RAZORPAY_WEBHOOK_SECRET."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Webhook is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    // ====================================
    // 2. GET RAZORPAY SIGNATURE
    // ====================================

    const signature =
      request.headers.get(
        "x-razorpay-signature"
      );

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing webhook signature.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 3. READ RAW BODY
    //
    // IMPORTANT:
    // Razorpay requires the exact raw
    // request body for HMAC validation.
    // ====================================

    const rawBody =
      await request.text();

    if (!rawBody) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Empty webhook body.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 4. VERIFY HMAC SIGNATURE
    // ====================================

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          webhookSecret
        )
        .update(
          rawBody
        )
        .digest("hex");

    let validSignature =
      false;

    if (
      signature.length ===
      expectedSignature.length
    ) {
      validSignature =
        crypto.timingSafeEqual(
          Buffer.from(
            expectedSignature,
            "utf8"
          ),
          Buffer.from(
            signature,
            "utf8"
          )
        );
    }

    if (!validSignature) {
      console.error(
        "Invalid Razorpay webhook signature."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook signature.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 5. PARSE VERIFIED BODY
    // ====================================

    let body: unknown;

    try {
      body =
        JSON.parse(
          rawBody
        );
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook payload.",
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
            "Invalid webhook payload.",
        },
        {
          status: 400,
        }
      );
    }

    const webhook =
      body as {
        event?: unknown;
      };

    const event =
      webhook.event;

    // ====================================
    // 6. ACCEPT ONLY order.paid
    // ====================================

    if (
      event !==
      "order.paid"
    ) {
      console.log(
        "Ignoring Razorpay event:",
        event
      );

      return NextResponse.json({
        success: true,
        ignored: true,
      });
    }

    // ====================================
    // 7. CREATE RAZORPAY CLIENT
    // ====================================

    const razorpayKeyId =
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    const razorpayKeySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (
      !razorpayKeyId ||
      !razorpayKeySecret
    ) {
      console.error(
        "Missing Razorpay API configuration."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const razorpay =
      new Razorpay({
        key_id:
          razorpayKeyId,

        key_secret:
          razorpayKeySecret,
      });

    // ====================================
    // 8. EXTRACT EVENT PAYMENT/ORDER IDS
    // ====================================

    const payload =
      webhook as {
        payload?: {
          order?: {
            entity?: {
              id?: unknown;
            };
          };
          payment?: {
            entity?: {
              id?: unknown;
              order_id?: unknown;
            };
          };
        };
      };

    const eventOrderId =
      payload
        .payload
        ?.order
        ?.entity
        ?.id;

    const eventPaymentId =
      payload
        .payload
        ?.payment
        ?.entity
        ?.id;

    if (
      typeof eventOrderId !==
        "string" ||
      typeof eventPaymentId !==
        "string" ||
      !eventOrderId ||
      !eventPaymentId
    ) {
      console.error(
        "Razorpay webhook missing order/payment IDs."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Incomplete webhook payload.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 9. FETCH ORDER FROM RAZORPAY
    //
    // The webhook payload is treated as
    // an event signal. Payment details are
    // independently fetched from Razorpay.
    // ====================================

    const razorpayOrder =
      (await razorpay.orders.fetch(
        eventOrderId
      )) as RazorpayOrder;

    if (
      razorpayOrder.id !==
      eventOrderId
    ) {
      console.error(
        "Order ID mismatch."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Order verification failed.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 10. VERIFY ORDER METADATA
    // ====================================

    const userId =
      razorpayOrder
        .notes
        ?.user_id;

    const orderPlan =
      razorpayOrder
        .notes
        ?.plan;

    const orderBillingCycle =
      razorpayOrder
        .notes
        ?.billing_cycle;

    if (
      !userId ||
      !orderPlan ||
      !orderBillingCycle
    ) {
      console.error(
        "Missing order metadata."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment order metadata is incomplete.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 11. VALIDATE PLAN
    // ====================================

    if (
      !Object.prototype.hasOwnProperty.call(
        PLAN_PRICES,
        orderPlan
      )
    ) {
      console.error(
        "Invalid plan in order metadata."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid subscription plan.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 12. VALIDATE BILLING CYCLE
    // ====================================

    if (
      !Object.prototype.hasOwnProperty.call(
        BILLING_DAYS,
        orderBillingCycle
      )
    ) {
      console.error(
        "Invalid billing cycle in order metadata."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid billing cycle.",
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
    // 13. VERIFY SERVER-SIDE AMOUNT
    // ====================================

    const amount =
      PLAN_PRICES[
        validPlan
      ][
        validBillingCycle
      ];

    const expectedAmountInPaise =
      amount * 100;

    if (
      razorpayOrder.amount !==
      expectedAmountInPaise
    ) {
      console.error(
        "Order amount mismatch."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment amount mismatch.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 14. VERIFY CURRENCY
    // ====================================

    if (
      razorpayOrder.currency !==
      "INR"
    ) {
      console.error(
        "Order currency mismatch."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported payment currency.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 15. FETCH PAYMENT
    // ====================================

    const razorpayPayment =
      (await razorpay.payments.fetch(
        eventPaymentId
      )) as RazorpayPayment;

    // ====================================
    // 16. VERIFY PAYMENT
    // ====================================

    if (
      razorpayPayment.id !==
      eventPaymentId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment ID mismatch.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      razorpayPayment.order_id !==
      eventOrderId
    ) {
      console.error(
        "Payment/order mismatch."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment does not belong to the order.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      razorpayPayment.amount !==
      expectedAmountInPaise
    ) {
      console.error(
        "Payment amount mismatch."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment amount mismatch.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      razorpayPayment.currency !==
      "INR"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported payment currency.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      razorpayPayment.status !==
        "captured" &&
      razorpayPayment.captured !==
        true
    ) {
      console.error(
        "Webhook payment is not captured:",
        razorpayPayment.status
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment has not been captured.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof razorpayPayment.amount_refunded ===
        "number" &&
      razorpayPayment.amount_refunded >
        0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment has been refunded.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================
    // 17. SUPABASE CONFIGURATION
    // ====================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseServiceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !supabaseServiceRoleKey
    ) {
      console.error(
        "Missing Supabase service configuration."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Database service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    // ====================================
    // 18. IDEMPOTENCY CHECK
    // ====================================

    const {
      data: existingPayment,
      error:
        paymentCheckError,
    } =
      await supabase
        .from(
          "payment_receipts"
        )
        .select(
          "id, receipt_number, user_id"
        )
        .eq(
          "payment_id",
          eventPaymentId
        )
        .maybeSingle();

    if (
      paymentCheckError
    ) {
      console.error(
        "Webhook payment check error:",
        paymentCheckError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check payment history.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      existingPayment
    ) {
      console.log(
        "Webhook duplicate payment ignored."
      );

      return NextResponse.json({
        success: true,
        duplicate: true,
      });
    }

    // ====================================
    // 19. SUBSCRIPTION DATES
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
    // 20. CHECK CURRENT SUBSCRIPTION
    // ====================================

    const {
      data: existingSubscription,
      error:
        subscriptionError,
    } =
      await supabase
        .from(
          "subscriptions"
        )
        .select(
          "id"
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "status",
          "active"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (
      subscriptionError
    ) {
      console.error(
        "Webhook subscription check error:",
        subscriptionError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check subscription.",
        },
        {
          status: 500,
        }
      );
    }

    // ====================================
    // 21. UPDATE SUBSCRIPTION
    // ====================================

    if (
      existingSubscription
    ) {
      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "subscriptions"
          )
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
              eventOrderId,

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
          "Webhook subscription update error:",
          updateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to update subscription.",
          },
          {
            status: 500,
          }
        );
      }
    } else {
      // ==================================
      // 22. CREATE SUBSCRIPTION
      // ==================================

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "subscriptions"
          )
          .insert([
            {
              user_id:
                userId,

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
                eventOrderId,

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
          "Webhook subscription insert error:",
          insertError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to create subscription.",
          },
          {
            status: 500,
          }
        );
      }
    }

    // ====================================
    // 23. CREATE RECEIPT NUMBER
    // ====================================

    const receiptNumber =
      `BIZAI-${Date.now()}-${crypto.randomInt(
        100000,
        1000000
      )}`;

    // ====================================
    // 24. SAVE PAYMENT RECEIPT
    // ====================================

    const {
      error:
        receiptError,
    } =
      await supabase
        .from(
          "payment_receipts"
        )
        .insert([
          {
            user_id:
              userId,

            receipt_number:
              receiptNumber,

            plan:
              validPlan,

            amount:
              amount,

            payment_id:
              eventPaymentId,

            order_id:
              eventOrderId,

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
        ]);

    if (
      receiptError
    ) {
      console.error(
        "Webhook receipt creation error:",
        receiptError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment received but receipt could not be saved.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "Razorpay order.paid webhook processed successfully:",
      eventOrderId
    );

    // ====================================
    // 25. SUCCESS
    // ====================================

    return NextResponse.json({
      success: true,
      processed: true,
    });
  } catch (error) {
    console.error(
      "Razorpay webhook error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}