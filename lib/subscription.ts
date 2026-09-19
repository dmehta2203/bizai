import { supabase } from "@/lib/supabase";

// ==============================
// SUBSCRIPTION PLANS
// ==============================

export type SubscriptionPlan =
  | "Starter"
  | "Professional"
  | "Business"
  | null;

// ==============================
// SUBSCRIPTION DATA
// ==============================

export type SubscriptionData = {
  id?: string;

  plan: SubscriptionPlan;

  status: string;

  billing_cycle: string | null;

  amount: number | null;

  razorpay_customer_id: string | null;

  razorpay_subscription_id: string | null;

  current_period_start: string | null;

  current_period_end: string | null;
};

// ==============================
// PLAN LEVELS
// ==============================

const PLAN_LEVELS = {
  Starter: 1,
  Professional: 2,
  Business: 3,
};

// ==============================
// GET USER SUBSCRIPTION
// ==============================

export async function getUserSubscription(
  userId: string
): Promise<SubscriptionData | null> {
  try {
    // ==========================
    // CHECK USER ID
    // ==========================

    if (!userId) {
      console.error(
        "Subscription error: User ID is missing"
      );

      return null;
    }

    // ==========================
    // GET ACTIVE SUBSCRIPTION
    // ==========================

    const {
      data,
      error,
    } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    // ==========================
    // DATABASE ERROR
    // ==========================

    if (error) {
      console.error(
        "Subscription database error:",
        error.message
      );

      return null;
    }

    // ==========================
    // NO SUBSCRIPTION
    // ==========================

    if (!data) {
      console.log(
        "No active subscription found"
      );

      return null;
    }

    // ==========================
    // CHECK EXPIRY
    // ==========================

    if (data.current_period_end) {
      const expiryDate =
        new Date(
          data.current_period_end
        );

      const today =
        new Date();

      // ========================
      // CHECK IF EXPIRED
      // ========================

      if (expiryDate <= today) {
        console.log(
          "Subscription expired. Updating status..."
        );

        // ======================
        // UPDATE STATUS
        // ======================

        const {
          error: expiryUpdateError,
        } = await supabase
          .from("subscriptions")
          .update({
            status: "expired",
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            data.id
          );

        // ======================
        // UPDATE ERROR
        // ======================

        if (expiryUpdateError) {
          console.error(
            "Failed to update expired subscription:",
            expiryUpdateError.message
          );
        } else {
          console.log(
            "Subscription status updated to expired"
          );
        }

        // ======================
        // RETURN NO ACCESS
        // ======================

        return null;
      }
    }

    // ==========================
    // NORMALIZE PLAN
    // ==========================

    let plan: SubscriptionPlan =
      null;

    const dbPlan =
      String(
        data.plan || ""
      )
        .trim()
        .toLowerCase();

    // ==========================
    // STARTER
    // ==========================

    if (
      dbPlan === "starter"
    ) {
      plan = "Starter";
    }

    // ==========================
    // PROFESSIONAL
    // ==========================

    if (
      dbPlan === "professional"
    ) {
      plan =
        "Professional";
    }

    // ==========================
    // BUSINESS
    // ==========================

    if (
      dbPlan === "business"
    ) {
      plan =
        "Business";
    }

    // ==========================
    // INVALID PLAN
    // ==========================

    if (!plan) {
      console.error(
        "Invalid subscription plan:",
        data.plan
      );

      return null;
    }

    // ==========================
    // RETURN SUBSCRIPTION
    // ==========================

    return {
      id:
        data.id,

      plan:
        plan,

      status:
        data.status ||
        "active",

      billing_cycle:
        data.billing_cycle ||
        null,

      amount:
        data.amount !== null &&
        data.amount !== undefined
          ? Number(data.amount)
          : null,

      razorpay_customer_id:
        data.razorpay_customer_id ||
        null,

      razorpay_subscription_id:
        data.razorpay_subscription_id ||
        null,

      current_period_start:
        data.current_period_start ||
        null,

      current_period_end:
        data.current_period_end ||
        null,
    };
  } catch (error) {
    console.error(
      "Subscription unexpected error:",
      error
    );

    return null;
  }
}

// ==============================
// CHECK SUBSCRIPTION ACTIVE
// ==============================

export async function isSubscriptionActive(
  userId: string
): Promise<boolean> {
  const subscription =
    await getUserSubscription(
      userId
    );

  return subscription !== null;
}

// ==============================
// GET USER PLAN
// ==============================

export async function getUserPlan(
  userId: string
): Promise<SubscriptionPlan> {
  const subscription =
    await getUserSubscription(
      userId
    );

  if (!subscription) {
    return null;
  }

  return subscription.plan;
}

// ==============================
// GET CURRENT PLAN
// ==============================

export async function getCurrentPlan(): Promise<SubscriptionPlan> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error(
        "Current plan user error:",
        error.message
      );

      return null;
    }

    if (!user) {
      return null;
    }

    return await getUserPlan(
      user.id
    );
  } catch (error) {
    console.error(
      "Current plan error:",
      error
    );

    return null;
  }
}

// ==============================
// BASE PLAN FEATURES
// ==============================

export const PLAN_FEATURES = {
  // ============================
  // STARTER
  // ============================

  Starter: [
    "customers",
    "leads",
    "tasks",
    "followUps",
    "appointments",
    "dashboard",
  ],

  // ============================
  // PROFESSIONAL
  // ============================

  Professional: [
    "sales",
    "analytics",
    "aiInsights",
    "notifications",
  ],

  // ============================
  // BUSINESS
  // ============================

  Business: [
    "advancedAI",
    "businessAnalytics",
    "priorityFeatures",
    "advancedNotifications",
    "premiumSupport",
    "fullBizAIAccess",
  ],
} as const;

// ==============================
// GET ALL PLAN FEATURES
// ==============================

export function getAllPlanFeatures(
  plan: SubscriptionPlan
): string[] {
  // ==========================
  // NO PLAN
  // ==========================

  if (!plan) {
    return [];
  }

  // ==========================
  // STARTER FEATURES
  // ==========================

  const starterFeatures = [
    ...PLAN_FEATURES.Starter,
  ];

  // ==========================
  // PROFESSIONAL FEATURES
  // STARTER + PROFESSIONAL
  // ==========================

  const professionalFeatures = [
    ...starterFeatures,
    ...PLAN_FEATURES.Professional,
  ];

  // ==========================
  // BUSINESS FEATURES
  // ALL FEATURES
  // ==========================

  const businessFeatures = [
    ...professionalFeatures,
    ...PLAN_FEATURES.Business,
  ];

  // ==========================
  // RETURN FEATURES
  // ==========================

  switch (plan) {
    case "Starter":
      return starterFeatures;

    case "Professional":
      return professionalFeatures;

    case "Business":
      return businessFeatures;

    default:
      return [];
  }
}

// ==============================
// CHECK FEATURE ACCESS
// ==============================

export function hasFeatureAccess(
  plan: SubscriptionPlan,
  feature: string
): boolean {
  // ==========================
  // NO PLAN
  // ==========================

  if (!plan) {
    return false;
  }

  // ==========================
  // GET FEATURES
  // ==========================

  const features =
    getAllPlanFeatures(
      plan
    );

  // ==========================
  // CHECK FEATURE
  // ==========================

  return features.includes(
    feature
  );
}

// ==============================
// CHECK USER FEATURE ACCESS
// ==============================

export async function canUserAccessFeature(
  userId: string,
  feature: string
): Promise<boolean> {
  // ==========================
  // GET USER PLAN
  // ==========================

  const plan =
    await getUserPlan(
      userId
    );

  // ==========================
  // CHECK ACCESS
  // ==========================

  return hasFeatureAccess(
    plan,
    feature
  );
}

// ==============================
// GET REQUIRED PLAN
// ==============================

export function getRequiredPlan(
  feature: string
):
  | "Starter"
  | "Professional"
  | "Business" {
  // ==========================
  // STARTER FEATURE
  // ==========================

  if (
    PLAN_FEATURES.Starter.includes(
      feature as never
    )
  ) {
    return "Starter";
  }

  // ==========================
  // PROFESSIONAL FEATURE
  // ==========================

  if (
    PLAN_FEATURES.Professional.includes(
      feature as never
    )
  ) {
    return "Professional";
  }

  // ==========================
  // BUSINESS FEATURE
  // ==========================

  if (
    PLAN_FEATURES.Business.includes(
      feature as never
    )
  ) {
    return "Business";
  }

  // ==========================
  // DEFAULT
  // ==========================

  return "Professional";
}

// ==============================
// CHECK PLAN LEVEL ACCESS
// ==============================

export function hasPlanLevelAccess(
  userPlan: SubscriptionPlan,
  requiredPlan:
    | "Starter"
    | "Professional"
    | "Business"
): boolean {
  // ==========================
  // NO PLAN
  // ==========================

  if (!userPlan) {
    return false;
  }

  // ==========================
  // CHECK LEVEL
  // ==========================

  return (
    PLAN_LEVELS[userPlan] >=
    PLAN_LEVELS[requiredPlan]
  );
}

// ==============================
// GET PLAN PRICE
// ==============================

export function getPlanPrice(
  plan: SubscriptionPlan
): number {
  switch (plan) {
    case "Starter":
      return 499;

    case "Professional":
      return 999;

    case "Business":
      return 1999;

    default:
      return 0;
  }
}

// ==============================
// GET PLAN FEATURES
// ==============================

export function getPlanFeatures(
  plan: SubscriptionPlan
): string[] {
  return getAllPlanFeatures(
    plan
  );
}

// ==============================
// GET PLAN DISPLAY NAME
// ==============================

export function getPlanDisplayName(
  plan: SubscriptionPlan
): string {
  if (!plan) {
    return "Free";
  }

  return plan;
}

// ==============================
// CHECK SUBSCRIPTION EXPIRY
// ==============================

export function isSubscriptionExpired(
  expiryDate: string | null
): boolean {
  // ==========================
  // NO EXPIRY DATE
  // ==========================

  if (!expiryDate) {
    return false;
  }

  const expiry =
    new Date(
      expiryDate
    );

  const today =
    new Date();

  // ==========================
  // CHECK DATE
  // ==========================

  return expiry <= today;
}