"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";

// ========================================
// TYPES
// ========================================

type Subscription = {
  id: string;
  plan: string;
  status: string;
  billing_cycle: string | null;
  amount: number | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
};

type PaymentReceipt = {
  id: string;
  receipt_number: string;
  plan: string;
  amount: number;
  payment_id: string;
  order_id: string;
  payment_status: string;
  billing_cycle: string | null;
  payment_date: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  created_at: string | null;
};

function SubscriptionContent() {
  const router = useRouter();

  // ========================================
  // STATES
  // ========================================

  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [paymentHistory, setPaymentHistory] =
    useState<PaymentReceipt[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingPayments, setLoadingPayments] =
    useState(false);

  const [error, setError] =
    useState("");

  const [daysRemaining, setDaysRemaining] =
    useState<number | null>(null);

  const [downloadingReceipt, setDownloadingReceipt] =
    useState<string | null>(null);

  // ========================================
  // LOAD DATA
  // ========================================

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    await Promise.all([
      loadSubscription(),
      loadPaymentHistory(),
    ]);
  }

  // ========================================
  // LOAD SUBSCRIPTION
  // ========================================

  async function loadSubscription() {
    try {
      setLoading(true);
      setError("");

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

        setError(
          "Unable to check your login session."
        );

        return;
      }

      if (!session?.user) {
        router.push("/login");
        return;
      }

      const userId = session.user.id;

      const { data, error } =
        await supabase
          .from("subscriptions")
          .select(`
            id,
            plan,
            status,
            billing_cycle,
            amount,
            current_period_start,
            current_period_end,
            created_at
          `)
          .eq("user_id", userId)
          .eq("status", "active")
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle();

      if (error) {
        console.error(
          "Subscription error:",
          error
        );

        setError(
          "Unable to load your subscription."
        );

        return;
      }

      if (!data) {
        setSubscription(null);
        setDaysRemaining(null);
        return;
      }

      setSubscription(data);

      // ====================================
      // CALCULATE DAYS REMAINING
      // ====================================

      if (data.current_period_end) {
        const today = new Date();

        const expiryDate =
          new Date(
            data.current_period_end
          );

        const difference =
          expiryDate.getTime() -
          today.getTime();

        const days =
          Math.ceil(
            difference /
              (1000 * 60 * 60 * 24)
          );

        setDaysRemaining(
          Math.max(0, days)
        );
      }

    } catch (error) {

      console.error(
        "Load subscription error:",
        error
      );

      setError(
        "Something went wrong while loading your subscription."
      );

    } finally {

      setLoading(false);

    }
  }

  // ========================================
  // LOAD PAYMENT HISTORY
  // ========================================

  async function loadPaymentHistory() {

    try {

      setLoadingPayments(true);

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.user) {
        return;
      }

      const userId =
        session.user.id;

      const {
        data,
        error,
      } =
        await supabase
          .from("payment_receipts")
          .select(`
            id,
            receipt_number,
            plan,
            amount,
            payment_id,
            order_id,
            payment_status,
            billing_cycle,
            payment_date,
            subscription_start,
            subscription_end,
            created_at
          `)
          .eq(
            "user_id",
            userId
          )
          .order(
            "payment_date",
            {
              ascending: false,
            }
          );

      if (error) {

        console.error(
          "Payment history error:",
          error
        );

        return;
      }

      setPaymentHistory(
        data || []
      );

    } catch (error) {

      console.error(
        "Payment history loading error:",
        error
      );

    } finally {

      setLoadingPayments(false);

    }
  }

  // ========================================
  // FORMAT DATE
  // ========================================

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

  // ========================================
  // FORMAT DATE TIME
  // ========================================

  function formatDateTime(
    date: string | null
  ) {

    if (!date) {
      return "Not available";
    }

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    ).format(
      new Date(date)
    );
  }

  // ========================================
  // FORMAT MONEY
  // ========================================

  function formatMoney(
    amount: number | null
  ) {

    if (
      amount === null ||
      amount === undefined
    ) {
      return "₹0";
    }

    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }
    ).format(amount);
  }

  // ========================================
  // DOWNLOAD RECEIPT
  // ========================================

  function downloadReceipt(
    receipt: PaymentReceipt
  ) {

    setDownloadingReceipt(
      receipt.id
    );

    try {

      const receiptContent =
`========================================
                 BIZAI
           PAYMENT RECEIPT
========================================

RECEIPT DETAILS

Receipt Number:
${receipt.receipt_number}

Payment Status:
${receipt.payment_status}

Payment Date:
${formatDateTime(receipt.payment_date)}

----------------------------------------

SUBSCRIPTION DETAILS

Plan:
${receipt.plan}

Billing Cycle:
${receipt.billing_cycle || "Monthly"}

Amount Paid:
${formatMoney(receipt.amount)}

Subscription Started:
${formatDate(
  receipt.subscription_start
)}

Subscription Ends:
${formatDate(
  receipt.subscription_end
)}

----------------------------------------

PAYMENT DETAILS

Payment ID:
${receipt.payment_id}

Order ID:
${receipt.order_id}

----------------------------------------

Thank you for choosing BizAI!

Your AI-powered business assistant.

BizAI
Smart AI Business Management

========================================
`;

      const blob =
        new Blob(
          [receiptContent],
          {
            type:
              "text/plain",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        `${receipt.receipt_number}.txt`;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      URL.revokeObjectURL(
        url
      );

    } catch (error) {

      console.error(
        "Receipt download error:",
        error
      );

      alert(
        "Unable to download receipt."
      );

    } finally {

      setTimeout(() => {

        setDownloadingReceipt(
          null
        );

      }, 500);

    }
  }

  // ========================================
  // GET PLAN STYLE
  // ========================================

  function getPlanStyle(
    plan: string
  ) {

    if (
      plan === "Business"
    ) {

      return {
        icon: "💎",
        gradient:
          "from-purple-600/20 via-pink-600/10 to-slate-900",
      };

    }

    if (
      plan === "Professional"
    ) {

      return {
        icon: "⭐",
        gradient:
          "from-blue-600/20 via-cyan-600/10 to-slate-900",
      };

    }

    return {

      icon: "🚀",

      gradient:
        "from-green-600/20 via-emerald-600/10 to-slate-900",

    };
  }

  // ========================================
  // GET STATUS STYLE
  // ========================================

  function getStatusStyle(
    status: string
  ) {

    const lowerStatus =
      status?.toLowerCase();

    if (
      lowerStatus === "active"
    ) {

      return {
        text: "Active",
        className:
          "bg-green-500/20 text-green-400 border-green-500/30",
      };

    }

    if (
      lowerStatus === "paid"
    ) {

      return {
        text: "Paid",
        className:
          "bg-green-500/20 text-green-400 border-green-500/30",
      };

    }

    if (
      lowerStatus === "expired"
    ) {

      return {
        text: "Expired",
        className:
          "bg-red-500/20 text-red-400 border-red-500/30",
      };

    }

    return {

      text:
        status || "Unknown",

      className:
        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",

    };
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-5 animate-pulse">
            💳
          </div>

          <h2 className="text-xl font-semibold">
            Loading your subscription...
          </h2>

          <p className="text-slate-400 mt-2">
            Please wait while we fetch your details.
          </p>

        </div>

      </main>

    );
  }

  // ========================================
  // ERROR
  // ========================================

  if (error) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center">

          <div className="text-5xl mb-5">
            ⚠️
          </div>

          <h2 className="text-2xl font-bold">
            Something Went Wrong
          </h2>

          <p className="text-slate-400 mt-3">
            {error}
          </p>

          <button
            onClick={loadAllData}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-semibold"
          >
            🔄 Try Again
          </button>

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="mt-3 w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-semibold"
          >
            🏠 Back to Dashboard
          </button>

        </div>

      </main>

    );
  }

  // ========================================
  // PLAN STYLE
  // ========================================

  const planStyle =
    subscription
      ? getPlanStyle(
          subscription.plan
        )
      : null;

  const statusStyle =
    subscription
      ? getStatusStyle(
          subscription.status
        )
      : null;

  // ========================================
  // MAIN PAGE
  // ========================================

  return (

    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-6xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">

          <div>

            <p className="text-blue-400 font-semibold text-sm">
              BIZAI ACCOUNT
            </p>

            <h1 className="text-3xl md:text-4xl font-bold mt-2">
              💳 My Subscription
            </h1>

            <p className="text-slate-400 mt-2">
              Manage your subscription and payment history.
            </p>

          </div>

          <div className="flex gap-3">

            <button
              onClick={loadAllData}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-3 rounded-xl font-semibold"
            >
              🔄 Refresh
            </button>

            <button
              onClick={() =>
                router.push("/pricing")
              }
              className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold"
            >
              🚀 View Plans
            </button>

          </div>

        </div>


        {/* CURRENT SUBSCRIPTION */}

        {subscription && planStyle && statusStyle ? (

          <>

            <div
              className={`bg-gradient-to-br ${planStyle.gradient} border border-slate-700 rounded-3xl overflow-hidden mb-8`}
            >

              <div className="p-6 md:p-10">

                <div className="flex flex-col md:flex-row md:justify-between gap-6">

                  <div>

                    <p className="text-slate-400 text-sm font-semibold">
                      CURRENT PLAN
                    </p>

                    <div className="flex items-center gap-4 mt-3">

                      <div className="text-5xl">
                        {planStyle.icon}
                      </div>

                      <div>

                        <h2 className="text-4xl font-bold">
                          {subscription.plan}
                        </h2>

                        <p className="text-slate-400 mt-1">
                          BizAI Premium Subscription
                        </p>

                      </div>

                    </div>

                  </div>


                  <div className="flex flex-col items-start md:items-end">

                    <p className="text-slate-400 text-sm">
                      STATUS
                    </p>

                    <div
                      className={`border px-5 py-3 rounded-full font-semibold mt-3 ${statusStyle.className}`}
                    >

                      ● {statusStyle.text}

                    </div>

                  </div>

                </div>


                <div className="border-t border-slate-700 my-8" />


                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

                  <div className="bg-slate-950/40 rounded-2xl p-5">

                    <p className="text-slate-400 text-sm">
                      💰 Plan Price
                    </p>

                    <p className="text-2xl font-bold mt-3">
                      {formatMoney(
                        subscription.amount
                      )}
                    </p>

                  </div>


                  <div className="bg-slate-950/40 rounded-2xl p-5">

                    <p className="text-slate-400 text-sm">
                      🔁 Billing Cycle
                    </p>

                    <p className="text-xl font-bold mt-3 capitalize">
                      {subscription.billing_cycle ||
                        "Monthly"}
                    </p>

                  </div>


                  <div className="bg-slate-950/40 rounded-2xl p-5">

                    <p className="text-slate-400 text-sm">
                      📅 Started
                    </p>

                    <p className="text-lg font-bold mt-3">
                      {formatDate(
                        subscription.current_period_start
                      )}
                    </p>

                  </div>


                  <div className="bg-slate-950/40 rounded-2xl p-5">

                    <p className="text-slate-400 text-sm">
                      ⏳ Days Left
                    </p>

                    <p className="text-3xl font-bold mt-2">
                      {daysRemaining ?? "—"}
                    </p>

                    <p className="text-slate-500 text-sm">
                      days remaining
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </>

        ) : (

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center mb-8">

            <div className="text-6xl">
              🚀
            </div>

            <h2 className="text-3xl font-bold mt-5">
              No Active Subscription
            </h2>

            <p className="text-slate-400 mt-3">
              Choose a BizAI plan to unlock premium features.
            </p>

            <button
              onClick={() =>
                router.push("/pricing")
              }
              className="mt-6 bg-blue-600 hover:bg-blue-700 px-7 py-4 rounded-xl font-semibold"
            >
              🚀 View Pricing Plans
            </button>

          </div>

        )}


        {/* PAYMENT HISTORY */}

        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden mb-8">

          <div className="p-6 md:p-8 border-b border-slate-800">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

              <div>

                <p className="text-blue-400 text-sm font-semibold">
                  PAYMENT RECORDS
                </p>

                <h2 className="text-2xl md:text-3xl font-bold mt-2">
                  🧾 Payment History
                </h2>

                <p className="text-slate-400 mt-2">
                  View all your BizAI subscription payments.
                </p>

              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 px-5 py-3 rounded-xl">

                <p className="text-slate-400 text-xs">
                  TOTAL PAYMENTS
                </p>

                <p className="text-2xl font-bold text-blue-400">
                  {paymentHistory.length}
                </p>

              </div>

            </div>

          </div>


          {/* LOADING PAYMENTS */}

          {loadingPayments ? (

            <div className="p-10 text-center">

              <div className="text-4xl animate-pulse">
                💳
              </div>

              <p className="text-slate-400 mt-4">
                Loading payment history...
              </p>

            </div>

          ) : paymentHistory.length === 0 ? (

            <div className="p-12 text-center">

              <div className="text-6xl">
                🧾
              </div>

              <h3 className="text-xl font-bold mt-5">
                No Payment History Yet
              </h3>

              <p className="text-slate-400 mt-3">
                Your completed BizAI payments will appear here.
              </p>

            </div>

          ) : (

            <div className="divide-y divide-slate-800">

              {paymentHistory.map(
                (receipt) => {

                  const receiptStatus =
                    getStatusStyle(
                      receipt.payment_status
                    );

                  return (

                    <div
                      key={receipt.id}
                      className="p-6 hover:bg-slate-800/40 transition"
                    >

                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">


                        {/* LEFT */}

                        <div className="flex gap-4">

                          <div className="w-14 h-14 shrink-0 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-2xl">

                            💳

                          </div>


                          <div>

                            <div className="flex flex-wrap items-center gap-3">

                              <h3 className="text-xl font-bold">

                                {receipt.plan}

                              </h3>

                              <span
                                className={`border px-3 py-1 rounded-full text-xs font-semibold ${receiptStatus.className}`}
                              >

                                ● {receiptStatus.text}

                              </span>

                            </div>


                            <p className="text-slate-400 text-sm mt-2">

                              {receipt.receipt_number}

                            </p>


                            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-slate-500">

                              <span>

                                📅 {formatDateTime(
                                  receipt.payment_date
                                )}

                              </span>

                              <span className="capitalize">

                                🔁 {receipt.billing_cycle ||
                                  "Monthly"}

                              </span>

                            </div>

                          </div>

                        </div>


                        {/* RIGHT */}

                        <div className="flex flex-col sm:flex-row sm:items-center gap-5 lg:text-right">

                          <div>

                            <p className="text-slate-500 text-sm">

                              AMOUNT PAID

                            </p>

                            <p className="text-2xl font-bold text-green-400 mt-1">

                              {formatMoney(
                                receipt.amount
                              )}

                            </p>

                          </div>


                          <button
                            onClick={() =>
                              downloadReceipt(
                                receipt
                              )
                            }

                            disabled={
                              downloadingReceipt ===
                              receipt.id
                            }

                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-5 py-3 rounded-xl font-semibold whitespace-nowrap"
                          >

                            {downloadingReceipt ===
                            receipt.id
                              ? "⏳ Preparing..."
                              : "⬇️ Receipt"}

                          </button>

                        </div>

                      </div>


                      {/* EXTRA DETAILS */}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-800 text-sm">

                        <div>

                          <p className="text-slate-500">
                            Subscription Period
                          </p>

                          <p className="text-slate-300 mt-1">

                            {formatDate(
                              receipt.subscription_start
                            )}

                            {" → "}

                            {formatDate(
                              receipt.subscription_end
                            )}

                          </p>

                        </div>


                        <div className="md:text-right">

                          <p className="text-slate-500">
                            Payment ID
                          </p>

                          <p className="text-slate-400 mt-1 break-all">

                            {receipt.payment_id}

                          </p>

                        </div>

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          )}

        </div>


        {/* PLAN BENEFITS */}

        {subscription && (

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 mb-8">

            <h2 className="text-2xl font-bold">
              ✨ Your Plan Benefits
            </h2>

            <p className="text-slate-400 mt-2">
              Features available with your current plan.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-7">

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                ✓ Customer Management
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                ✓ Lead Management
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                ✓ Task Management
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                ✓ Follow-up Management
              </div>

              {subscription.plan !== "Starter" && (

                <div className="bg-slate-950 border border-blue-500/20 rounded-xl p-4">
                  ✓ Sales Management
                </div>

              )}

              {subscription.plan !== "Starter" && (

                <div className="bg-slate-950 border border-blue-500/20 rounded-xl p-4">
                  ✓ Smart Analytics
                </div>

              )}

              {subscription.plan === "Business" && (

                <div className="bg-slate-950 border border-purple-500/20 rounded-xl p-4">
                  ✓ Advanced AI Insights
                </div>

              )}

              {subscription.plan === "Business" && (

                <div className="bg-slate-950 border border-purple-500/20 rounded-xl p-4">
                  ✓ Business Intelligence
                </div>

              )}

            </div>

          </div>

        )}


        {/* UPGRADE */}

        <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-slate-900 border border-blue-500/30 rounded-2xl p-6 md:p-8">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

            <div>

              <h2 className="text-2xl font-bold">
                🚀 Grow Your Business
              </h2>

              <p className="text-slate-300 mt-3 max-w-2xl">
                Unlock more powerful BizAI tools and
                AI-powered business features.
              </p>

            </div>

            <button
              onClick={() =>
                router.push("/pricing")
              }
              className="bg-blue-600 hover:bg-blue-700 px-7 py-4 rounded-xl font-semibold whitespace-nowrap"
            >
              👑 View Plans
            </button>

          </div>

        </div>


        {/* FOOTER */}

        <div className="text-center mt-10">

          <p className="text-slate-500">

            🔒 Your payment information is securely managed.

          </p>

          <p className="text-slate-600 text-sm mt-3">

            BizAI • Smart AI Business Management

          </p>

        </div>

      </div>

    </main>

  );
}


// ========================================
// PROTECTED PAGE
// ========================================

export default function SubscriptionPage() {

  return (

    <ProtectedRoute>

      <SubscriptionContent />

    </ProtectedRoute>

  );
}