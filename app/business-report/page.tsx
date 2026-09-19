"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type ReportData = {
  businessOverview: {
    customers: number;
    appointments: number;
    healthScore: number;
  };

  revenue: {
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
    totalSales: number;
  };

  leads: {
    totalLeads: number;
    newLeads: number;
    contactedLeads: number;
    interestedLeads: number;
    negotiationLeads: number;
    convertedLeads: number;
    conversionRate: number;
  };

  tasks: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    taskCompletionRate: number;
  };

  followUps: {
    totalFollowUps: number;
    completedFollowUps: number;
    pendingFollowUps: number;
    overdueFollowUps: number;
    followUpCompletionRate: number;
  };
};

export default function BusinessReportPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [report, setReport] =
    useState("");

  const [reportData, setReportData] =
    useState<ReportData | null>(null);

  const [error, setError] =
    useState("");

  const [userId, setUserId] =
    useState("");

  // ======================================
  // CHECK USER
  // ======================================

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      setUserId(
        session.user.id
      );
    } catch (error) {
      console.error(
        "User check error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  // ======================================
  // GENERATE REPORT
  // ======================================

  async function generateReport() {
    try {
      setGenerating(true);

      setError("");

      // ======================================
      // GET CURRENT SESSION
      // ======================================

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      // ======================================
      // CHECK ACCESS TOKEN
      // ======================================

      if (!session.access_token) {
        setError(
          "Your authentication session is missing. Please log in again."
        );

        await supabase.auth.signOut();

        router.push("/login");

        return;
      }

      // ======================================
      // SECURE BUSINESS REPORT REQUEST
      // ======================================

      const response =
        await fetch(
          "/api/business-report",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({}),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to generate business report."
        );
      }

      if (result.report) {
        setReport(
          result.report
        );
      }

      if (result.data) {
        setReportData(
          result.data
        );
      }

    } catch (error: any) {
      console.error(
        "Report error:",
        error
      );

      setError(
        error.message ||
          "Something went wrong."
      );

    } finally {
      setGenerating(false);
    }
  }

  // ======================================
  // FORMAT MONEY
  // ======================================

  function formatMoney(
    amount: number
  ) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style:
          "currency",

        currency:
          "INR",

        maximumFractionDigits:
          0,
      }
    ).format(amount);
  }

  // ======================================
  // HEALTH STATUS
  // ======================================

  function getHealthStatus(
    score: number
  ) {
    if (score >= 80) {
      return {
        text: "Excellent",
        emoji: "🟢",
        color: "text-green-400",
      };
    }

    if (score >= 60) {
      return {
        text: "Good",
        emoji: "🟡",
        color: "text-yellow-400",
      };
    }

    if (score >= 40) {
      return {
        text: "Needs Attention",
        emoji: "🟠",
        color: "text-orange-400",
      };
    }

    return {
      text: "Critical",
      emoji: "🔴",
      color: "text-red-400",
    };
  }

  // ======================================
  // LOADING
  // ======================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">

          <div className="text-5xl mb-4">
            🤖
          </div>

          <p className="text-slate-400">
            Loading Business Report...
          </p>

        </div>
      </main>
    );
  }

  const health =
    reportData
      ? getHealthStatus(
          reportData.businessOverview
            .healthScore
        )
      : null;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

          <div>

            <h1 className="text-3xl md:text-4xl font-bold">
              📊 AI Business Performance Report
            </h1>

            <p className="text-slate-400 mt-2">
              Get a complete AI-powered analysis
              of your business performance.
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-3 rounded-xl"
            >
              🏠 Dashboard
            </button>

            <button
              onClick={() =>
                router.push("/ai-assistant")
              }
              className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold"
            >
              🤖 Ask BizAI
            </button>

            <button
              onClick={generateReport}
              disabled={generating}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold"
            >
              {generating
                ? "🤖 Generating..."
                : "✨ Generate Report"}
            </button>

          </div>

        </div>


        {/* INTRO */}

        {!reportData &&
          !generating &&
          !error && (

            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-8 md:p-12 text-center">

              <div className="text-6xl mb-5">
                🤖📊
              </div>

              <h2 className="text-2xl md:text-3xl font-bold">
                Your AI Business Consultant
              </h2>

              <p className="text-slate-400 max-w-2xl mx-auto mt-4">
                Generate a complete business performance
                report using your real sales, leads, tasks
                and follow-up data.
              </p>

              <button
                onClick={generateReport}
                disabled={generating}
                className="mt-7 bg-purple-600 hover:bg-purple-700 px-7 py-4 rounded-xl font-semibold text-lg disabled:opacity-50"
              >
                🚀 Generate My Report
              </button>

            </div>

          )}


        {/* GENERATING */}

        {generating && (

          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-12 text-center">

            <div className="text-6xl mb-5 animate-pulse">
              🤖
            </div>

            <h2 className="text-2xl font-bold">
              BizAI is analyzing your business...
            </h2>

            <p className="text-slate-400 mt-3">
              Analyzing sales, leads, tasks,
              follow-ups and business performance.
            </p>

          </div>

        )}


        {/* ERROR */}

        {error && (

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">

            <h3 className="text-red-400 font-semibold text-lg">
              ⚠️ Unable to Generate Report
            </h3>

            <p className="text-slate-300 mt-2">
              {error}
            </p>

            <button
              onClick={generateReport}
              className="mt-4 bg-red-600 hover:bg-red-700 px-5 py-3 rounded-lg"
            >
              🔄 Try Again
            </button>

          </div>

        )}


        {/* REPORT DATA */}

        {reportData &&
          !generating && (

            <>

              {/* HEALTH SCORE */}

              <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-6 md:p-8 mb-8">

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                  <div>

                    <p className="text-slate-400 text-sm">
                      BUSINESS HEALTH SCORE
                    </p>

                    <div className="flex items-center gap-5 mt-3">

                      <h2 className="text-5xl font-bold">

                        {
                          reportData
                            .businessOverview
                            .healthScore
                        }

                        <span className="text-2xl text-slate-400">
                          /100
                        </span>

                      </h2>

                      {health && (

                        <div>

                          <p
                            className={`font-semibold ${health.color}`}
                          >
                            {health.emoji}{" "}
                            {health.text}
                          </p>

                          <p className="text-slate-400 text-sm">
                            Overall business performance
                          </p>

                        </div>

                      )}

                    </div>

                  </div>

                  <div className="text-6xl">
                    📊
                  </div>

                </div>

              </div>


              {/* MAIN STATS */}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

                <div className="bg-slate-900 border border-green-500/20 rounded-xl p-5">

                  <p className="text-slate-400 text-sm">
                    💰 Revenue
                  </p>

                  <p className="text-xl md:text-2xl font-bold text-green-400 mt-2">
                    {formatMoney(
                      reportData
                        .revenue
                        .totalRevenue
                    )}
                  </p>

                </div>


                <div className="bg-slate-900 border border-blue-500/20 rounded-xl p-5">

                  <p className="text-slate-400 text-sm">
                    🎯 Leads
                  </p>

                  <p className="text-3xl font-bold text-blue-400 mt-2">
                    {
                      reportData
                        .leads
                        .totalLeads
                    }
                  </p>

                </div>


                <div className="bg-slate-900 border border-yellow-500/20 rounded-xl p-5">

                  <p className="text-slate-400 text-sm">
                    📋 Tasks
                  </p>

                  <p className="text-3xl font-bold text-yellow-400 mt-2">
                    {
                      reportData
                        .tasks
                        .totalTasks
                    }
                  </p>

                </div>


                <div className="bg-slate-900 border border-purple-500/20 rounded-xl p-5">

                  <p className="text-slate-400 text-sm">
                    📞 Follow-ups
                  </p>

                  <p className="text-3xl font-bold text-purple-400 mt-2">
                    {
                      reportData
                        .followUps
                        .totalFollowUps
                    }
                  </p>

                </div>

              </div>


              {/* PERFORMANCE CARDS */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">


                {/* REVENUE */}

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                  <h2 className="text-xl font-bold mb-5">
                    💰 Revenue Performance
                  </h2>

                  <div className="space-y-4">

                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Total Revenue
                      </span>

                      <span className="font-semibold text-green-400">
                        {formatMoney(
                          reportData
                            .revenue
                            .totalRevenue
                        )}
                      </span>

                    </div>


                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Paid
                      </span>

                      <span>
                        {formatMoney(
                          reportData
                            .revenue
                            .paidRevenue
                        )}
                      </span>

                    </div>


                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Pending
                      </span>

                      <span className="text-yellow-400">
                        {formatMoney(
                          reportData
                            .revenue
                            .pendingRevenue
                        )}
                      </span>

                    </div>


                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Total Sales
                      </span>

                      <span>
                        {
                          reportData
                            .revenue
                            .totalSales
                        }
                      </span>

                    </div>

                  </div>

                </div>


                {/* LEADS */}

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                  <h2 className="text-xl font-bold mb-5">
                    🎯 Lead Performance
                  </h2>

                  <div className="space-y-4">

                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Total Leads
                      </span>

                      <span>
                        {
                          reportData
                            .leads
                            .totalLeads
                        }
                      </span>

                    </div>


                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Interested
                      </span>

                      <span>
                        {
                          reportData
                            .leads
                            .interestedLeads
                        }
                      </span>

                    </div>


                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Negotiation
                      </span>

                      <span>
                        {
                          reportData
                            .leads
                            .negotiationLeads
                        }
                      </span>

                    </div>


                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Converted
                      </span>

                      <span className="text-green-400">
                        {
                          reportData
                            .leads
                            .convertedLeads
                        }
                      </span>

                    </div>


                    <div className="border-t border-slate-800 pt-4 flex justify-between">

                      <span className="text-slate-400">
                        Conversion Rate
                      </span>

                      <span className="text-blue-400 font-bold">
                        {
                          reportData
                            .leads
                            .conversionRate
                        }%
                      </span>

                    </div>

                  </div>

                </div>


                {/* TASKS */}

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                  <h2 className="text-xl font-bold mb-5">
                    📋 Task Productivity
                  </h2>

                  <div className="space-y-4">

                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Completed
                      </span>

                      <span className="text-green-400">
                        {
                          reportData
                            .tasks
                            .completedTasks
                        }
                      </span>

                    </div>


                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Pending
                      </span>

                      <span className="text-yellow-400">
                        {
                          reportData
                            .tasks
                            .pendingTasks
                        }
                      </span>

                    </div>


                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Overdue
                      </span>

                      <span className="text-red-400">
                        {
                          reportData
                            .tasks
                            .overdueTasks
                        }
                      </span>

                    </div>


                    <div className="border-t border-slate-800 pt-4 flex justify-between">

                      <span className="text-slate-400">
                        Completion Rate
                      </span>

                      <span className="text-blue-400 font-bold">
                        {
                          reportData
                            .tasks
                            .taskCompletionRate
                        }%
                      </span>

                    </div>

                  </div>

                </div>

              </div>


              {/* FOLLOW-UP PERFORMANCE */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

                <h2 className="text-xl font-bold mb-6">
                  📞 Follow-up Performance
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">

                  <div>

                    <p className="text-slate-400 text-sm">
                      Total
                    </p>

                    <p className="text-2xl font-bold mt-2">
                      {
                        reportData
                          .followUps
                          .totalFollowUps
                      }
                    </p>

                  </div>


                  <div>

                    <p className="text-slate-400 text-sm">
                      Completed
                    </p>

                    <p className="text-2xl font-bold text-green-400 mt-2">
                      {
                        reportData
                          .followUps
                          .completedFollowUps
                      }
                    </p>

                  </div>


                  <div>

                    <p className="text-slate-400 text-sm">
                      Pending
                    </p>

                    <p className="text-2xl font-bold text-yellow-400 mt-2">
                      {
                        reportData
                          .followUps
                          .pendingFollowUps
                      }
                    </p>

                  </div>


                  <div>

                    <p className="text-slate-400 text-sm">
                      Completion Rate
                    </p>

                    <p className="text-2xl font-bold text-blue-400 mt-2">
                      {
                        reportData
                          .followUps
                          .followUpCompletionRate
                      }%
                    </p>

                  </div>

                </div>

              </div>


              {/* AI REPORT */}

              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-6 md:p-8">

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

                  <div>

                    <h2 className="text-2xl font-bold">
                      🤖 BizAI Analysis
                    </h2>

                    <p className="text-slate-400 mt-1">
                      AI-powered recommendations based
                      on your real business data.
                    </p>

                  </div>


                  <button
                    onClick={generateReport}
                    disabled={generating}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-5 py-3 rounded-xl font-semibold"
                  >
                    🔄 Regenerate
                  </button>

                </div>


                <div className="bg-slate-950/70 border border-slate-700 rounded-xl p-5 md:p-7">

                  <div className="whitespace-pre-line text-slate-300 leading-7">
                    {report}
                  </div>

                </div>

              </div>

            </>

          )}

      </div>

    </main>
  );
}