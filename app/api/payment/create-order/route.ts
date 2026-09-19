import { NextResponse } from "next/server";
import Razorpay from "razorpay";

// ==============================
// PLAN PRICES
// ==============================

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

// ==============================
// POST
// ==============================

export async function POST(
  request: Request
) {
  try {

    const body =
      await request.json();

    const {
      plan,
      billingCycle,
    } = body;

    // ==========================
    // CHECK PLAN
    // ==========================

    if (
      !plan ||
      !(
        plan in PLAN_PRICES
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

    // ==========================
    // CHECK BILLING CYCLE
    // ==========================

    const validCycles = [
      "weekly",
      "monthly",
      "quarterly",
    ];

    if (
      !billingCycle ||
      !validCycles.includes(
        billingCycle
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

    // ==========================
    // GET PRICE
    // ==========================

    const price =
      PLAN_PRICES[
        plan as keyof typeof PLAN_PRICES
      ][
        billingCycle as
          | "weekly"
          | "monthly"
          | "quarterly"
      ];

    // ==========================
    // RAZORPAY INSTANCE
    // ==========================

    const razorpay =
      new Razorpay({

        key_id:
          process.env
            .NEXT_PUBLIC_RAZORPAY_KEY_ID!,

        key_secret:
          process.env
            .RAZORPAY_KEY_SECRET!,

      });

    // ==========================
    // CREATE ORDER
    // ==========================

    const order =
      await razorpay.orders.create({

        amount:
          price * 100,

        currency:
          "INR",

        receipt:
          `bizai_${plan}_${Date.now()}`,

      });

    // ==========================
    // SUCCESS
    // ==========================

    return NextResponse.json({

      success: true,

      order,

      plan,

      billingCycle,

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