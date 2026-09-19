"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

type BusinessData = {
  plan: string;

  customers: number;

  leads: {
    total: number;
    new: number;
    interested: number;
    converted: number;
  };

  tasks: {
    total: number;
    completed: number;
    pending: number;
  };

  followUps: {
    total: number;
    completed: number;
    pending: number;
  };

  appointments: number;

  sales: {
    total: number;
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
  };
};

function AIInsightsContent() {
  const router = useRouter();

  const [userId, setUserId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [checkingAccess, setCheckingAccess] =
    useState(true);

  const [insights, setInsights] =
    useState<string | null>(null);

  const [businessData, setBusinessData] =
    useState<BusinessData | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  // =====================================
  // CHECK USER + SUBSCRIPTION
  // =====================================

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    try {
      setCheckingAccess(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      const currentUserId =
        session.user.id;

      setUserId(currentUserId);

      // =====================================
      // CHECK SUBSCRIPTION
      // =====================================

      const { data, error } =
        await supabase
          .from("subscriptions")
          .select(
            "plan, status, current_period_end"
          )
          .eq(
            "user_id",
            currentUserId
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

      if (error) {
        console.error(
          "Subscription error:",
          error
        );
      }

      if (!data) {
        alert(
          "Please purchase a subscription plan to use AI Insights."
        );

        router.push("/pricing");

        return;
      }

      // =====================================
      // CHECK PLAN
      // =====================================

      const allowedPlans = [
        "Professional",
        "Business",
      ];

      if (
        !allowedPlans.includes(
          data.plan
        )
      ) {
        alert(
          "AI Insights is available only for Professional and Business plans."
        );

        router.push("/pricing");

        return;
      }

      // =====================================
      // CHECK EXPIRY
      // =====================================

      if (data.current_period_end) {
        const expiryDate =
          new Date(
            data.current_period_end
          );

        if (
          expiryDate <
          new Date()
        ) {
          alert(
            "Your subscription has expired."
          );

          router.push("/pricing");

          return;
        }
      }

    } catch (error) {
      console.error(
        "Access error:",
        error
      );

    } finally {
      setCheckingAccess(false);
    }
  }

  // =====================================
  // GENERATE AI INSIGHTS
  // =====================================

  async function generateInsights() {
    if (!userId || loading) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response =
        await fetch(
          "/api/ai-insights",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              userId,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Failed to generate insights."
        );
      }

      setInsights(
        data.insights
      );

      setBusinessData(
        data.businessData
      );

    } catch (error: any) {

      console.error(
        "Insights error:",
        error
      );

      setError(
        error.message ||
        "Something went wrong while generating insights."
      );

    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // LOADING SCREEN
  // =====================================

  if (checkingAccess) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="w-16 h-16 mx-auto mb-5 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />

          <h2 className="text-xl font-semibold">
            Checking AI Insights Access...
          </h2>

          <p className="text-slate-400 mt-2">
            Preparing your business intelligence.
          </p>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">

          <div className="flex items-center justify-between gap-4">

            {/* LEFT */}

            <div className="flex items-center gap-3">

              <button
                onClick={() =>
                  router.push(
                    "/dashboard"
                  )
                }

                className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 transition flex items-center justify-center text-xl"
              >
                ←
              </button>

              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-2xl">

                🧠

              </div>

              <div>

                <h1 className="font-bold text-lg md:text-xl">

                  AI Business Insights

                </h1>

                <p className="text-xs text-purple-400">

                  Powered by BizAI Intelligence

                </p>

              </div>

            </div>


            {/* GENERATE BUTTON */}

            <button
              onClick={
                generateInsights
              }

              disabled={loading}

              className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed font-semibold transition"
            >

              {loading
                ? "Analyzing..."
                : "✨ Generate Insights"
              }

            </button>

          </div>

        </div>

      </header>


      {/* ================================= */}
      {/* MAIN CONTENT */}
      {/* ================================= */}

      <section className="max-w-7xl mx-auto px-4 md:px-6 py-8">


        {/* ================================= */}
        {/* INTRO */}
        {/* ================================= */}

        {!businessData && !loading && (

          <div className="text-center py-16">

            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-5xl shadow-lg shadow-purple-500/20">

              🧠

            </div>

            <h2 className="text-3xl md:text-4xl font-bold">

              Understand Your Business Better

            </h2>

            <p className="text-slate-400 mt-4 max-w-2xl mx-auto">

              BizAI analyzes your real business data
              and gives you smart recommendations
              to improve sales, leads and productivity.

            </p>

            <button
              onClick={
                generateInsights
              }

              className="mt-8 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 font-semibold transition"
            >

              ✨ Generate My AI Insights

            </button>

          </div>

        )}


        {/* ================================= */}
        {/* LOADING */}
        {/* ================================= */}

        {loading && (

          <div className="py-20 text-center">

            <div className="w-20 h-20 mx-auto rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />

            <h2 className="text-2xl font-bold mt-6">

              BizAI is analyzing your business...

            </h2>

            <p className="text-slate-400 mt-3">

              Checking sales, leads, customers,
              tasks and business performance.

            </p>

          </div>

        )}


        {/* ================================= */}
        {/* ERROR */}
        {/* ================================= */}

        {error && (

          <div className="max-w-xl mx-auto mt-8 bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">

            <div className="text-3xl mb-3">

              ⚠️

            </div>

            <h3 className="font-bold text-red-400">

              Unable to Generate Insights

            </h3>

            <p className="text-slate-400 mt-2">

              {error}

            </p>

            <button
              onClick={
                generateInsights
              }

              className="mt-5 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 transition"
            >

              Try Again

            </button>

          </div>

        )}


        {/* ================================= */}
        {/* BUSINESS DATA */}
        {/* ================================= */}

        {businessData && !loading && (

          <>

            {/* ================================= */}
            {/* TOP STATS */}
            {/* ================================= */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">


              {/* REVENUE */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                <p className="text-slate-400 text-sm">

                  Total Revenue

                </p>

                <h3 className="text-3xl font-bold mt-3 text-green-400">

                  ₹
                  {businessData
                    .sales
                    .totalRevenue
                    .toLocaleString(
                      "en-IN"
                    )}

                </h3>

                <p className="text-slate-500 text-xs mt-3">

                  {businessData.sales.total}
                  {" "}
                  total sales

                </p>

              </div>


              {/* CUSTOMERS */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                <p className="text-slate-400 text-sm">

                  Customers

                </p>

                <h3 className="text-3xl font-bold mt-3">

                  👥{" "}
                  {
                    businessData
                      .customers
                  }

                </h3>

                <p className="text-slate-500 text-xs mt-3">

                  Total customers

                </p>

              </div>


              {/* LEADS */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                <p className="text-slate-400 text-sm">

                  Converted Leads

                </p>

                <h3 className="text-3xl font-bold mt-3 text-blue-400">

                  🎯{" "}
                  {
                    businessData
                      .leads
                      .converted
                  }

                </h3>

                <p className="text-slate-500 text-xs mt-3">

                  Out of{" "}
                  {
                    businessData
                      .leads
                      .total
                  }{" "}
                  leads

                </p>

              </div>


              {/* TASKS */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                <p className="text-slate-400 text-sm">

                  Completed Tasks

                </p>

                <h3 className="text-3xl font-bold mt-3 text-purple-400">

                  ✅{" "}
                  {
                    businessData
                      .tasks
                      .completed
                  }

                </h3>

                <p className="text-slate-500 text-xs mt-3">

                  {
                    businessData
                      .tasks
                      .pending
                  }{" "}
                  pending

                </p>

              </div>

            </div>


            {/* ================================= */}
            {/* SECONDARY STATS */}
            {/* ================================= */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">


              {/* PAID */}

              <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6">

                <p className="text-green-400 text-sm">

                  💰 Paid Revenue

                </p>

                <h3 className="text-2xl font-bold mt-3">

                  ₹
                  {businessData
                    .sales
                    .paidRevenue
                    .toLocaleString(
                      "en-IN"
                    )}

                </h3>

              </div>


              {/* PENDING */}

              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-6">

                <p className="text-yellow-400 text-sm">

                  ⏳ Pending Revenue

                </p>

                <h3 className="text-2xl font-bold mt-3">

                  ₹
                  {businessData
                    .sales
                    .pendingRevenue
                    .toLocaleString(
                      "en-IN"
                    )}

                </h3>

              </div>


              {/* APPOINTMENTS */}

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">

                <p className="text-blue-400 text-sm">

                  📅 Appointments

                </p>

                <h3 className="text-2xl font-bold mt-3">

                  {
                    businessData
                      .appointments
                  }

                </h3>

              </div>

            </div>


            {/* ================================= */}
            {/* AI INSIGHTS */}
            {/* ================================= */}

            {insights && (

              <div className="bg-slate-900 border border-purple-500/30 rounded-3xl overflow-hidden">


                {/* INSIGHTS HEADER */}

                <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-purple-500/20 p-6">

                  <div className="flex items-center gap-4">

                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-3xl">

                      🧠

                    </div>

                    <div>

                      <h2 className="text-2xl font-bold">

                        BizAI Business Analysis

                      </h2>

                      <p className="text-slate-400 text-sm mt-1">

                        AI-powered recommendations
                        based on your real business data

                      </p>

                    </div>

                  </div>

                </div>


                {/* INSIGHTS CONTENT */}

                <div className="p-6 md:p-8">

                  <div className="whitespace-pre-wrap text-slate-300 leading-relaxed text-base">

                    {insights}

                  </div>

                </div>

              </div>

            )}

          </>

        )}

      </section>


      {/* ================================= */}
      {/* FOOTER */}
      {/* ================================= */}

      <footer className="border-t border-slate-800 mt-10">

        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-slate-500 text-sm">

          🧠 BizAI Insights • Powered by Artificial Intelligence

        </div>

      </footer>

    </main>
  );
}


// =====================================
// PROTECTED PAGE
// =====================================

export default function AIInsightsPage() {

  return (

    <ProtectedRoute>

      <AIInsightsContent />

    </ProtectedRoute>

  );
}