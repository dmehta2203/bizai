import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

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
};

// ========================================
// BILLING DAYS
// ========================================

const BILLING_DAYS = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
};

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
// CREATE SUPABASE ADMIN CLIENT
// ========================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ========================================
// POST
// ========================================

export async function POST(request: Request) {

  try {

    // ====================================
    // GET REQUEST DATA
    // ====================================

    const body = await request.json();

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      plan,
      billingCycle,
      userId,
    } = body;

    console.log(
      "Payment verification started"
    );

    console.log({
      razorpay_payment_id,
      razorpay_order_id,
      plan,
      billingCycle,
      userId,
    });

    // ====================================
    // CHECK REQUIRED DATA
    // ====================================

    if (
      !razorpay_payment_id ||
      !razorpay_order_id ||
      !razorpay_signature ||
      !plan ||
      !billingCycle ||
      !userId
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
    // VALIDATE PLAN
    // ====================================

    if (
      !Object.keys(
        PLAN_PRICES
      ).includes(plan)
    ) {

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
    // VALIDATE BILLING CYCLE
    // ====================================

    if (
      !Object.keys(
        BILLING_DAYS
      ).includes(
        billingCycle
      )
    ) {

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
      plan as PlanName;

    const validBillingCycle =
      billingCycle as BillingCycle;

    // ====================================
    // GET CORRECT PRICE
    // SERVER SIDE PRICE
    // ====================================

    const amount =
      PLAN_PRICES[
        validPlan
      ][
        validBillingCycle
      ];

    // ====================================
    // VERIFY RAZORPAY SIGNATURE
    // ====================================

    const bodyToVerify =
      razorpay_order_id +
      "|" +
      razorpay_payment_id;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env
            .RAZORPAY_KEY_SECRET!
        )
        .update(
          bodyToVerify
        )
        .digest(
          "hex"
        );

    // ====================================
    // CHECK SIGNATURE
    // ====================================

    if (
      expectedSignature !==
      razorpay_signature
    ) {

      console.error(
        "Invalid Razorpay signature"
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

    console.log(
      "Razorpay payment verified"
    );

    // ====================================
    // PREVENT DUPLICATE PAYMENT
    // ====================================

    const {
      data: existingPayment,
      error: paymentCheckError,
    } =
      await supabase
        .from(
          "payment_receipts"
        )
        .select(
          "id, receipt_number"
        )
        .eq(
          "payment_id",
          razorpay_payment_id
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
            paymentCheckError.message,
        },
        {
          status: 500,
        }
      );

    }

    // ====================================
    // IF PAYMENT ALREADY EXISTS
    // ====================================

    if (
      existingPayment
    ) {

      console.log(
        "Duplicate payment prevented"
      );

      return NextResponse.json({

        success: true,

        message:
          "Payment already processed",

        duplicate:
          true,

        receipt:
          existingPayment,

      });

    }

    // ====================================
    // SUBSCRIPTION DATES
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
    // CHECK CURRENT SUBSCRIPTION
    // ====================================

    const {
      data: existingSubscription,
      error: subscriptionError,
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
        "Subscription check error:",
        subscriptionError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            subscriptionError.message,
        },
        {
          status: 500,
        }
      );

    }

    // ====================================
    // UPDATE CURRENT SUBSCRIPTION
    // ====================================

    if (
      existingSubscription
    ) {

      const {
        error: updateError,
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
              razorpay_order_id,

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
              updateError.message,
          },
          {
            status: 500,
          }
        );

      }

      console.log(
        "Subscription updated"
      );

    } else {

      // ==================================
      // CREATE SUBSCRIPTION
      // ==================================

      const {
        error: insertError,
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
                razorpay_order_id,

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
              insertError.message,
          },
          {
            status: 500,
          }
        );

      }

      console.log(
        "New subscription created"
      );

    }

    // ====================================
    // GENERATE RECEIPT NUMBER
    // ====================================

    const receiptNumber =
      `BIZAI-${Date.now()}-${Math.floor(
        Math.random() * 100000
      )}`;

    // ====================================
    // SAVE PAYMENT RECEIPT
    // EVERY PAYMENT IS SAVED HERE
    // ====================================

    const {
      data: receipt,
      error: receiptError,
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
              razorpay_payment_id,

            order_id:
              razorpay_order_id,

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
            "Payment successful but receipt could not be saved: " +
            receiptError.message,
        },
        {
          status: 500,
        }
      );

    }

    console.log(
      "Payment receipt created:",
      receipt
    );

    // ====================================
    // SUCCESS RESPONSE
    // ====================================

    return NextResponse.json({

      success:
        true,

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

  } catch (
    error
  ) {

    console.error(
      "Payment verification error:",
      error
    );

    return NextResponse.json(
      {

        success:
          false,

        error:
          "Payment verification failed",

      },
      {
        status: 500,
      }
    );

  }

}