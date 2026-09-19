"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  getUserSubscription,
  type SubscriptionPlan,
} from "@/lib/subscription";

declare global {
  interface Window {
    Razorpay: any;
  }
}

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

type Plan = {
  name: PlanName;
  description: string;
  features: string[];
  popular?: boolean;
  icon: string;
};

type CurrentSubscription = {
  plan: SubscriptionPlan;
  status: string;
  billing_cycle: string | null;
  current_period_end: string | null;
};

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
// BILLING DETAILS
// ==============================

const BILLING_DETAILS = {
  weekly: {
    label: "Weekly",
    shortLabel: "/ week",
    icon: "⚡",
    days: 7,
  },

  monthly: {
    label: "Monthly",
    shortLabel: "/ month",
    icon: "📅",
    days: 30,
  },

  quarterly: {
    label: "Quarterly",
    shortLabel: "/ 3 months",
    icon: "🗓️",
    days: 90,
  },
};

// ==============================
// PRICING PAGE
// ==============================

export default function PricingPage() {
  const router = useRouter();

  // ==============================
  // STATES
  // ==============================

  const [
    selectedBillingCycle,
    setSelectedBillingCycle,
  ] = useState<BillingCycle>("monthly");

  const [
    loadingPlan,
    setLoadingPlan,
  ] = useState<string | null>(null);

  const [
    loadingSubscription,
    setLoadingSubscription,
  ] = useState(true);

  const [
    currentSubscription,
    setCurrentSubscription,
  ] = useState<CurrentSubscription | null>(null);

  const [
    userId,
    setUserId,
  ] = useState<string | null>(null);

  // ==============================
  // PLANS
  // ==============================

  const plans: Plan[] = [
    {
      name: "Starter",

      icon: "🚀",

      description:
        "Everything you need to start managing your business smarter.",

      features: [
        "Customer Management",
        "Lead Management",
        "Task Management",
        "Follow-up Management",
        "Appointment Management",
        "Basic Dashboard",
      ],
    },

    {
      name: "Professional",

      icon: "⭐",

      description:
        "Powerful tools for growing businesses that need more control.",

      popular: true,

      features: [
        "Everything in Starter",
        "Sales Management",
        "Advanced Dashboard",
        "AI Business Insights",
        "Smart Notifications",
        "Business Analytics",
        "Priority Support",
      ],
    },

    {
      name: "Business",

      icon: "💎",

      description:
        "The complete AI-powered solution for ambitious businesses.",

      features: [
        "Everything in Professional",
        "Advanced AI Insights",
        "Advanced Business Analytics",
        "Priority Features",
        "Advanced Notifications",
        "Premium Support",
        "Full BizAI Access",
      ],
    },
  ];

  // ==============================
  // LOAD SUBSCRIPTION
  // ==============================

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      setLoadingSubscription(true);

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error(
          "Session error:",
          error
        );
      }

      if (!session?.user) {
        setCurrentSubscription(null);
        setUserId(null);

        return;
      }

      const loggedInUserId =
        session.user.id;

      setUserId(loggedInUserId);

      const subscription =
        await getUserSubscription(
          loggedInUserId
        );

      if (subscription) {
        setCurrentSubscription({
          plan: subscription.plan,
          status: subscription.status,
          billing_cycle:
            subscription.billing_cycle,
          current_period_end:
            subscription.current_period_end,
        });
      } else {
        setCurrentSubscription(null);
      }
    } catch (error) {
      console.error(
        "Subscription loading error:",
        error
      );

      setCurrentSubscription(null);
    } finally {
      setLoadingSubscription(false);
    }
  }

  // ==============================
  // PLAN LEVEL
  // ==============================

  function getPlanLevel(
    planName: string
  ) {
    const levels = {
      Starter: 1,
      Professional: 2,
      Business: 3,
    };

    return (
      levels[
        planName as keyof typeof levels
      ] || 0
    );
  }

  // ==============================
  // CURRENT PLAN CHECK
  // PLAN + BILLING CYCLE
  // ==============================

  function isCurrentPlan(
    planName: PlanName
  ) {
    if (
      !currentSubscription?.plan
    ) {
      return false;
    }

    return (
      currentSubscription.plan ===
        planName &&
      currentSubscription.billing_cycle ===
        selectedBillingCycle
    );
  }

  // ==============================
  // SAME PLAN DIFFERENT CYCLE
  // ==============================

  function isSamePlanDifferentCycle(
    planName: PlanName
  ) {
    if (
      !currentSubscription?.plan
    ) {
      return false;
    }

    return (
      currentSubscription.plan ===
        planName &&
      currentSubscription.billing_cycle !==
        selectedBillingCycle
    );
  }

  // ==============================
  // LOWER PLAN CHECK
  // ==============================

  function isLowerPlan(
    planName: PlanName
  ) {
    if (
      !currentSubscription?.plan
    ) {
      return false;
    }

    return (
      getPlanLevel(planName) <
      getPlanLevel(
        currentSubscription.plan
      )
    );
  }

  // ==============================
  // GET BUTTON TEXT
  // ==============================

  function getButtonText(
    plan: Plan
  ) {
    if (
      loadingPlan === plan.name
    ) {
      return "⏳ Processing...";
    }

    if (
      isCurrentPlan(plan.name)
    ) {
      return "✓ Current Plan";
    }

    if (
      isSamePlanDifferentCycle(
        plan.name
      )
    ) {
      return `🔄 Switch to ${
        BILLING_DETAILS[
          selectedBillingCycle
        ].label
      }`;
    }

    if (
      isLowerPlan(plan.name)
    ) {
      return "✓ Included in Your Plan";
    }

    if (
      currentSubscription?.plan
    ) {
      return `⬆ Upgrade to ${plan.name}`;
    }

    return `🚀 Get ${plan.name}`;
  }

  // ==============================
  // LOAD RAZORPAY SCRIPT
  // ==============================

  function loadRazorpayScript():
    Promise<boolean> {
    return new Promise(
      (resolve) => {
        if (window.Razorpay) {
          resolve(true);

          return;
        }

        const existingScript =
          document.getElementById(
            "razorpay-script"
          );

        if (existingScript) {
          existingScript.addEventListener(
            "load",
            () => resolve(true)
          );

          existingScript.addEventListener(
            "error",
            () => resolve(false)
          );

          return;
        }

        const script =
          document.createElement(
            "script"
          );

        script.id =
          "razorpay-script";

        script.src =
          "https://checkout.razorpay.com/v1/checkout.js";

        script.async = true;

        script.onload =
          () => resolve(true);

        script.onerror =
          () => resolve(false);

        document.body.appendChild(
          script
        );
      }
    );
  }

  // ==============================
  // HANDLE PAYMENT
  // ==============================

  async function handlePayment(
    plan: Plan
  ) {
    if (loadingPlan) {
      return;
    }

    // ==========================
    // CURRENT PLAN
    // ==========================

    if (
      isCurrentPlan(plan.name)
    ) {
      alert(
        "You already have this plan and billing cycle active."
      );

      return;
    }

    // ==========================
    // LOWER PLAN
    // ==========================

    if (
      isLowerPlan(plan.name)
    ) {
      alert(
        "This plan is already included in your current subscription."
      );

      return;
    }

    setLoadingPlan(plan.name);

    // Capture these values for this
    // specific payment attempt.
    const selectedPlanName =
      plan.name;

    const selectedCycle =
      selectedBillingCycle;

    try {
      // ========================
      // GET AUTH SESSION
      // ========================

      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "Session error:",
          sessionError
        );

        alert(
          "Unable to check your login session."
        );

        setLoadingPlan(null);

        return;
      }

      if (!session?.user) {
        alert(
          "Please login before purchasing a plan."
        );

        setLoadingPlan(null);

        router.push("/login");

        return;
      }

      if (!session.access_token) {
        alert(
          "Your authentication session is missing. Please log in again."
        );

        await supabase.auth.signOut();

        setLoadingPlan(null);

        router.push("/login");

        return;
      }

      // Keep the authenticated user ID
      // only for local UI state.
      setUserId(
        session.user.id
      );

      // ========================
      // LOAD RAZORPAY
      // ========================

      const razorpayLoaded =
        await loadRazorpayScript();

      if (!razorpayLoaded) {
        alert(
          "Failed to load Razorpay. Please check your internet connection."
        );

        setLoadingPlan(null);

        return;
      }

      if (!window.Razorpay) {
        alert(
          "Razorpay is not available. Please refresh and try again."
        );

        setLoadingPlan(null);

        return;
      }

      // ========================
      // CREATE ORDER
      // ========================

      const orderResponse =
        await fetch(
          "/api/payment/create-order",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                plan:
                  selectedPlanName,

                billingCycle:
                  selectedCycle,
              }),
          }
        );

      let orderData: any;

      try {
        orderData =
          await orderResponse.json();
      } catch {
        orderData = {
          error:
            "Invalid server response.",
        };
      }

      console.log(
        "Order Data:",
        orderData
      );

      if (!orderResponse.ok) {
        alert(
          orderData.error ||
            "Failed to create payment order."
        );

        setLoadingPlan(null);

        return;
      }

      if (!orderData.order) {
        alert(
          "Payment order was not created properly."
        );

        setLoadingPlan(null);

        return;
      }

      // ========================
      // OPEN RAZORPAY
      // ========================

      const options = {
        key:
          process.env
            .NEXT_PUBLIC_RAZORPAY_KEY_ID,

        amount:
          orderData.order.amount,

        currency:
          orderData.order.currency ||
          "INR",

        name: "BizAI",

        description:
          `${selectedPlanName} ${BILLING_DETAILS[selectedCycle].label} Subscription`,

        order_id:
          orderData.order.id,

        handler:
          async function (
            response: any
          ) {
            try {
              setLoadingPlan(
                selectedPlanName
              );

              // ====================
              // GET FRESH SESSION
              // ====================

              const {
                data: {
                  session:
                    verifySession,
                },
                error:
                  verifySessionError,
              } =
                await supabase.auth.getSession();

              if (
                verifySessionError ||
                !verifySession?.user ||
                !verifySession.access_token
              ) {
                console.error(
                  "Verification session error:",
                  verifySessionError
                );

                alert(
                  "Your login session is no longer valid. Please log in again."
                );

                setLoadingPlan(null);

                await supabase.auth.signOut();

                router.push(
                  "/login"
                );

                return;
              }

              // ====================
              // VERIFY PAYMENT
              // ====================

              const verifyResponse =
                await fetch(
                  "/api/payment/verify",
                  {
                    method: "POST",

                    headers: {
                      "Content-Type":
                        "application/json",

                      Authorization:
                        `Bearer ${verifySession.access_token}`,
                    },

                    // IMPORTANT:
                    // Do NOT send userId.
                    //
                    // The verification API now
                    // gets the user from the
                    // authenticated access token.
                    //
                    // Do not trust plan/billingCycle
                    // here either. The server gets
                    // them from Razorpay order notes.
                    body:
                      JSON.stringify({
                        razorpay_payment_id:
                          response.razorpay_payment_id,

                        razorpay_order_id:
                          response.razorpay_order_id,

                        razorpay_signature:
                          response.razorpay_signature,
                      }),
                  }
                );

              let verifyData: any;

              try {
                verifyData =
                  await verifyResponse.json();
              } catch {
                verifyData = {
                  error:
                    "Invalid verification response.",
                };
              }

              console.log(
                "Verification Data:",
                verifyData
              );

              // ====================
              // SUCCESS
              // ====================

              if (
                verifyResponse.ok &&
                verifyData.success
              ) {
                alert(
                  `🎉 Payment Successful!\n\nYour ${selectedPlanName} ${BILLING_DETAILS[selectedCycle].label} plan has been activated successfully!`
                );

                await loadSubscription();

                setLoadingPlan(null);

                router.push(
                  "/subscription"
                );

                router.refresh();

                return;
              }

              // ====================
              // VERIFICATION FAILED
              // ====================

              alert(
                verifyData.error ||
                  "Payment verification failed."
              );

              setLoadingPlan(null);
            } catch (error) {
              console.error(
                "Verification error:",
                error
              );

              alert(
                "Payment was completed but verification failed. Please contact support."
              );

              setLoadingPlan(null);
            }
          },

        prefill: {
          name:
            session.user.user_metadata
              ?.full_name || "",

          email:
            session.user.email || "",
        },

        theme: {
          color: "#2563eb",
        },

        modal: {
          ondismiss:
            function () {
              setLoadingPlan(null);
            },
        },
      };

      // ========================
      // CREATE RAZORPAY
      // ========================

      const paymentObject =
        new window.Razorpay(
          options
        );

      // ========================
      // PAYMENT FAILED
      // ========================

      paymentObject.on(
        "payment.failed",
        function (
          response: any
        ) {
          console.error(
            "Payment failed:",
            response
          );

          alert(
            response.error
              ?.description ||
              "Payment failed. Please try again."
          );

          setLoadingPlan(null);
        }
      );

      paymentObject.open();
    } catch (error) {
      console.error(
        "Payment error:",
        error
      );

      alert(
        "Something went wrong while starting the payment."
      );

      setLoadingPlan(null);
    }
  }

  // ==============================
  // FORMAT DATE
  // ==============================

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "Not available";
    }

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    ).format(
      new Date(date)
    );
  }

  // ==============================
  // LOADING
  // ==============================

  if (loadingSubscription) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl animate-pulse mb-5">
            💎
          </div>

          <h2 className="text-xl font-semibold">
            Loading BizAI Pricing...
          </h2>

          <p className="text-slate-400 mt-2">
            Checking your subscription.
          </p>
        </div>
      </main>
    );
  }

  // ==============================
  // MAIN PAGE
  // ==============================

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HERO */}

      <section className="px-6 pt-16 md:pt-20 pb-10 text-center">
        <div className="max-w-4xl mx-auto">

          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-sm font-semibold">
            ✨ BIZAI SUBSCRIPTIONS
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mt-7 leading-tight">
            Simple Pricing for

            <span className="block text-blue-500 mt-2">
              Smarter Businesses
            </span>
          </h1>

          <p className="text-slate-400 text-lg mt-6 max-w-2xl mx-auto leading-relaxed">
            Choose a flexible plan that fits your business.
            Upgrade anytime as your business grows.
          </p>

        </div>
      </section>

      {/* CURRENT SUBSCRIPTION */}

      {currentSubscription?.plan && (
        <section className="max-w-3xl mx-auto px-6 mb-10">

          <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-slate-900 border border-blue-500/30 rounded-2xl p-6 text-center">

            <p className="text-slate-400 text-sm font-semibold">
              YOUR CURRENT PLAN
            </p>

            <h2 className="text-3xl font-bold mt-3">
              💎 {currentSubscription.plan}
            </h2>

            <div className="flex flex-wrap justify-center gap-3 mt-4">

              <span className="bg-green-500/15 border border-green-500/30 text-green-400 px-4 py-2 rounded-full text-sm">
                ● {currentSubscription.status}
              </span>

              {currentSubscription.billing_cycle && (
                <span className="bg-blue-500/15 border border-blue-500/30 text-blue-300 px-4 py-2 rounded-full text-sm capitalize">
                  🔁{" "}
                  {
                    currentSubscription.billing_cycle
                  }
                </span>
              )}

            </div>

            {currentSubscription.current_period_end && (
              <p className="text-slate-400 text-sm mt-5">
                📅 Valid until{" "}
                <span className="text-white font-semibold">
                  {formatDate(
                    currentSubscription.current_period_end
                  )}
                </span>
              </p>
            )}

            <button
              onClick={() =>
                router.push(
                  "/subscription"
                )
              }
              className="mt-6 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-3 rounded-xl font-semibold transition"
            >
              💳 Manage Subscription
            </button>

          </div>

        </section>
      )}

      {/* BILLING SELECTOR */}

      <section className="max-w-3xl mx-auto px-6 mb-14">

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {(
              Object.keys(
                BILLING_DETAILS
              ) as BillingCycle[]
            ).map(
              (cycle) => {

                const details =
                  BILLING_DETAILS[
                    cycle
                  ];

                const selected =
                  selectedBillingCycle ===
                  cycle;

                return (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() =>
                      setSelectedBillingCycle(
                        cycle
                      )
                    }
                    className={`relative py-4 px-4 rounded-xl font-semibold transition ${
                      selected
                        ? "bg-blue-600 text-white shadow-lg"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >

                    <div className="text-lg">
                      {details.icon}{" "}
                      {details.label}
                    </div>

                    <div
                      className={`text-xs mt-1 ${
                        selected
                          ? "text-blue-100"
                          : "text-slate-500"
                      }`}
                    >
                      Valid for{" "}
                      {details.days} days
                    </div>

                    {cycle ===
                      "quarterly" && (
                      <span className="absolute -top-3 right-3 bg-green-500 text-white text-[10px] px-2 py-1 rounded-full">
                        BEST VALUE
                      </span>
                    )}

                  </button>
                );
              }
            )}

          </div>

        </div>

      </section>

      {/* PRICING CARDS */}

      <section className="max-w-7xl mx-auto px-6 pb-20">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {plans.map(
            (plan) => {

              const current =
                isCurrentPlan(
                  plan.name
                );

              const lower =
                isLowerPlan(
                  plan.name
                );

              const price =
                PLAN_PRICES[
                  plan.name
                ][
                  selectedBillingCycle
                ];

              const billing =
                BILLING_DETAILS[
                  selectedBillingCycle
                ];

              return (
                <div
                  key={plan.name}
                  className={`relative rounded-3xl border p-8 transition duration-300 hover:-translate-y-2 ${
                    plan.popular
                      ? "border-blue-500 bg-gradient-to-b from-blue-900/40 via-slate-900 to-slate-900 shadow-2xl shadow-blue-900/20"
                      : current
                      ? "border-green-500 bg-gradient-to-b from-green-900/20 to-slate-900"
                      : "border-slate-800 bg-slate-900 hover:border-slate-700"
                  }`}
                >

                  {/* BADGE */}

                  {current && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">

                      <span className="bg-green-600 px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap">
                        ✓ CURRENT PLAN
                      </span>

                    </div>
                  )}

                  {plan.popular &&
                    !current && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">

                        <span className="bg-blue-600 px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap">
                          ⭐ MOST POPULAR
                        </span>

                      </div>
                    )}

                  {/* ICON */}

                  <div className="text-5xl mb-6">
                    {plan.icon}
                  </div>

                  {/* NAME */}

                  <h2 className="text-3xl font-bold">
                    {plan.name}
                  </h2>

                  {/* DESCRIPTION */}

                  <p className="text-slate-400 mt-4 min-h-[72px] leading-relaxed">
                    {plan.description}
                  </p>

                  {/* PRICE */}

                  <div className="mt-8 pb-8 border-b border-slate-800">

                    <div className="flex items-end gap-2">

                      <span className="text-5xl font-bold">
                        ₹{price}
                      </span>

                      <span className="text-slate-400 mb-2">
                        {billing.shortLabel}
                      </span>

                    </div>

                    <p className="text-slate-500 text-sm mt-3">
                      {billing.icon}{" "}
                      Full access for{" "}
                      {billing.days} days
                    </p>

                  </div>

                  {/* FEATURES */}

                  <div className="space-y-4 my-8">

                    {plan.features.map(
                      (feature) => (
                        <div
                          key={feature}
                          className="flex items-start gap-3"
                        >

                          <span className="text-green-400 font-bold">
                            ✓
                          </span>

                          <span className="text-slate-300 text-sm">
                            {feature}
                          </span>

                        </div>
                      )
                    )}

                  </div>

                  {/* BUTTON */}

                  <button
                    type="button"
                    onClick={() =>
                      handlePayment(
                        plan
                      )
                    }
                    disabled={
                      loadingPlan !== null ||
                      current ||
                      lower
                    }
                    className={`w-full py-4 rounded-xl font-semibold transition ${
                      current
                        ? "bg-green-600 cursor-not-allowed"
                        : lower
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                        : plan.popular
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-slate-800 hover:bg-slate-700 border border-slate-700"
                    } disabled:opacity-60`}
                  >
                    {getButtonText(plan)}
                  </button>

                </div>
              );
            }
          )}

        </div>

        {/* LOGIN */}

        {!userId && (
          <div className="max-w-2xl mx-auto mt-12 text-center">

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

              <p className="text-slate-300">
                Already have a BizAI account?
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/login"
                  )
                }
                className="text-blue-400 hover:text-blue-300 font-semibold mt-3"
              >
                Login to manage your subscription →
              </button>

            </div>

          </div>
        )}

        {/* TRUST */}

        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">

            <div className="text-2xl">
              🔒
            </div>

            <p className="font-semibold mt-3">
              Secure Payments
            </p>

            <p className="text-slate-500 text-sm mt-2">
              Payments securely processed by Razorpay.
            </p>

          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">

            <div className="text-2xl">
              🚀
            </div>

            <p className="font-semibold mt-3">
              Instant Access
            </p>

            <p className="text-slate-500 text-sm mt-2">
              Your plan activates after successful payment.
            </p>

          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">

            <div className="text-2xl">
              📈
            </div>

            <p className="font-semibold mt-3">
              Upgrade Anytime
            </p>

            <p className="text-slate-500 text-sm mt-2">
              Move to a bigger plan as your business grows.
            </p>

          </div>

        </div>

        {/* FOOTER */}

        <div className="text-center mt-14">

          <p className="text-slate-500">
            🔒 Secure payments powered by Razorpay
          </p>

          <p className="text-slate-600 text-sm mt-3">
            BizAI • Smart AI Business Management
          </p>

        </div>

      </section>

    </main>
  );
}