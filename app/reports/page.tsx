"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

type ReportData = {
  subscription?: {
    plan?: string;
  };

  business?: {
    totalCustomers?: number;
    totalAppointments?: number;
    appointmentsToday?: number;
    healthScore?: number;
  };

  sales?: {
    totalSales?: number;
    totalRevenue?: number;
    paidRevenue?: number;
    pendingRevenue?: number;
  };

  leads?: {
    total?: number;
    new?: number;
    contacted?: number;
    interested?: number;
    negotiation?: number;
    converted?: number;
    conversionRate?: number;
  };

  tasks?: {
    total?: number;
    completed?: number;
    pending?: number;
    overdue?: number;
    completionRate?: number;
  };

  followUps?: {
    total?: number;
    completed?: number;
    pending?: number;
    overdue?: number;
    dueToday?: number;
  };
};

function ReportsContent() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);

  const [report, setReport] = useState("");
  const [reportData, setReportData] =
    useState<ReportData | null>(null);

  const [generatedAt, setGeneratedAt] =
    useState("");

  const [error, setError] = useState("");

  const [userId, setUserId] =
    useState("");

  // =====================================
  // GET CURRENT USER
  // =====================================

  useEffect(() => {
    getCurrentUser();
  }, []);

  async function getCurrentUser() {
    try {
      setCheckingUser(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      setUserId(session.user.id);

    } catch (error) {
      console.error(
        "User error:",
        error
      );

    } finally {
      setCheckingUser(false);
    }
  }

  // =====================================
  // GENERATE REPORT
  // =====================================

  async function generateReport() {
    try {
      setLoading(true);
      setError("");

      // =====================================
      // GET CURRENT SESSION
      // =====================================

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      // =====================================
      // CHECK ACCESS TOKEN
      // =====================================

      if (!session.access_token) {
        setError(
          "Your authentication session is missing. Please log in again."
        );

        await supabase.auth.signOut();

        router.push("/login");

        return;
      }

      // =====================================
      // SECURE AI REPORT REQUEST
      // =====================================

      const response =
        await fetch(
          "/api/ai-report",
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

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Failed to generate report."
        );
      }

      setReport(
        data.report || ""
      );

      setReportData(
        data.reportData || null
      );

      setGeneratedAt(
        data.generatedAt || ""
      );

    } catch (error: any) {

      console.error(
        "Report error:",
        error
      );

      setError(
        error.message ||
        "Something went wrong while generating your report."
      );

    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // FORMAT MONEY
  // =====================================

  function formatMoney(
    amount: number | undefined
  ) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }
    ).format(amount || 0);
  }

  // =====================================
  // FORMAT DATE
  // =====================================

  function formatDate(date: string) {
    if (!date) {
      return "";
    }

    return new Date(
      date
    ).toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  // =====================================
  // GET HEALTH STATUS
  // =====================================

  function getHealthStatus(
    score: number
  ) {
    if (score >= 80) {
      return {
        text: "Excellent",
        color: "text-green-400",
        emoji: "🟢",
      };
    }

    if (score >= 60) {
      return {
        text: "Good",
        color: "text-yellow-400",
        emoji: "🟡",
      };
    }

    if (score >= 40) {
      return {
        text: "Needs Attention",
        color: "text-orange-400",
        emoji: "🟠",
      };
    }

    return {
      text: "Critical",
      color: "text-red-400",
      emoji: "🔴",
    };
  }

  // =====================================
  // LOADING SCREEN
  // =====================================

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="w-16 h-16 mx-auto mb-5 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />

          <h2 className="text-xl font-bold">
            Preparing BizAI Reports...
          </h2>

          <p className="text-slate-400 mt-2">
            Loading your business intelligence.
          </p>

        </div>

      </main>
    );
  }

  const healthScore =
    reportData?.business?.healthScore || 0;

  const health =
    getHealthStatus(
      healthScore
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-20">

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div className="flex items-center gap-4">

              <button
                onClick={() =>
                  router.push("/dashboard")
                }
                className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 transition flex items-center justify-center text-xl"
              >
                ←
              </button>

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-2xl shadow-lg">
                🤖
              </div>

              <div>

                <h1 className="text-xl md:text-2xl font-bold">
                  BizAI Business Reports
                </h1>

                <p className="text-slate-400 text-sm">
                  AI-powered business intelligence
                </p>

              </div>

            </div>


            <button
              onClick={generateReport}
              disabled={
                loading ||
                !userId
              }
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold transition"
            >

              {loading
                ? "🤖 Generating..."
                : report
                  ? "🔄 Generate New Report"
                  : "✨ Generate AI Report"}

            </button>

          </div>

        </div>

      </header>


      {/* ================================= */}
      {/* MAIN */}
      {/* ================================= */}

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">


        {/* ================================= */}
        {/* PAGE INTRO */}
        {/* ================================= */}

        {!report && !loading && (

          <div className="text-center py-12">

            <div className="text-7xl mb-6">
              🤖📊
            </div>

            <h2 className="text-3xl md:text-4xl font-bold">

              Your AI Business Report

            </h2>

            <p className="text-slate-400 max-w-2xl mx-auto mt-4">

              Let BizAI analyze your real business data
              and generate personalized insights,
              priorities and growth recommendations.

            </p>


            <button
              onClick={generateReport}
              disabled={
                loading ||
                !userId
              }
              className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 px-8 py-4 rounded-xl font-bold text-lg transition disabled:opacity-50"
            >

              ✨ Generate My Business Report

            </button>

          </div>

        )}


        {/* ================================= */}
        {/* LOADING */}
        {/* ================================= */}

        {loading && (

          <div className="py-20 text-center">

            <div className="w-20 h-20 mx-auto rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />

            <h2 className="text-2xl font-bold mt-8">

              🤖 BizAI is analyzing your business...

            </h2>

            <p className="text-slate-400 mt-3">

              Checking sales, leads, tasks,
              follow-ups and business performance.

            </p>

          </div>

        )}


        {/* ================================= */}
        {/* ERROR */}
        {/* ================================= */}

        {error && !loading && (

          <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">

            <div className="text-4xl mb-3">
              ⚠️
            </div>

            <h3 className="font-bold text-red-400">
              Unable to Generate Report
            </h3>

            <p className="text-slate-300 mt-2">
              {error}
            </p>

            <button
              onClick={generateReport}
              className="mt-5 bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl font-semibold"
            >
              Try Again
            </button>

          </div>

        )}


        {/* ================================= */}
        {/* REPORT */}
        {/* ================================= */}

        {report && !loading && (

          <div className="space-y-8">


            {/* ================================= */}
            {/* REPORT HEADER */}
            {/* ================================= */}

            <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-2xl p-6 md:p-8">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

                <div>

                  <p className="text-purple-300 text-sm font-semibold">
                    🤖 AI-GENERATED BUSINESS INTELLIGENCE
                  </p>

                  <h2 className="text-3xl font-bold mt-2">
                    Daily Business Report
                  </h2>

                  {generatedAt && (

                    <p className="text-slate-400 text-sm mt-3">
                      📅 Generated on{" "}
                      {formatDate(
                        generatedAt
                      )}
                    </p>

                  )}

                </div>

                <div className="bg-slate-950/60 border border-slate-700 rounded-xl px-5 py-4">

                  <p className="text-xs text-slate-400">
                    SUBSCRIPTION PLAN
                  </p>

                  <p className="font-bold mt-1 text-purple-300">

                    👑{" "}

                    {reportData
                      ?.subscription
                      ?.plan || "Active"}

                  </p>

                </div>

              </div>

            </div>


            {/* ================================= */}
            {/* BUSINESS HEALTH */}
            {/* ================================= */}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                <div>

                  <p className="text-slate-400 text-sm">
                    BUSINESS HEALTH SCORE
                  </p>

                  <div className="flex items-center gap-5 mt-3">

                    <h2 className="text-5xl md:text-6xl font-bold">

                      {healthScore}

                      <span className="text-2xl text-slate-500">
                        /100
                      </span>

                    </h2>

                    <div>

                      <p
                        className={`font-bold ${health.color}`}
                      >
                        {health.emoji}{" "}
                        {health.text}
                      </p>

                      <p className="text-slate-400 text-sm mt-1">
                        Based on current business activity
                      </p>

                    </div>

                  </div>

                </div>

                <div className="text-6xl">
                  📊
                </div>

              </div>

            </div>


            {/* ================================= */}
            {/* QUICK STATS */}
            {/* ================================= */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">


              {/* REVENUE */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">

                <p className="text-slate-400 text-sm">
                  💰 Total Revenue
                </p>

                <p className="text-2xl font-bold text-green-400 mt-3">

                  {formatMoney(
                    reportData
                      ?.sales
                      ?.totalRevenue
                  )}

                </p>

              </div>


              {/* LEADS */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">

                <p className="text-slate-400 text-sm">
                  🎯 Total Leads
                </p>

                <p className="text-3xl font-bold text-blue-400 mt-3">

                  {reportData
                    ?.leads
                    ?.total || 0}

                </p>

              </div>


              {/* CONVERSION */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">

                <p className="text-slate-400 text-sm">
                  📈 Conversion Rate
                </p>

                <p className="text-3xl font-bold text-purple-400 mt-3">

                  {reportData
                    ?.leads
                    ?.conversionRate || 0}%

                </p>

              </div>


              {/* CUSTOMERS */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">

                <p className="text-slate-400 text-sm">
                  👥 Customers
                </p>

                <p className="text-3xl font-bold text-cyan-400 mt-3">

                  {reportData
                    ?.business
                    ?.totalCustomers || 0}

                </p>

              </div>

            </div>


            {/* ================================= */}
            {/* DETAILED STATS */}
            {/* ================================= */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">


              {/* SALES */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                <h3 className="text-xl font-bold">
                  💰 Revenue Overview
                </h3>

                <div className="space-y-4 mt-6">

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Total Revenue
                    </span>

                    <span className="font-semibold text-green-400">

                      {formatMoney(
                        reportData
                          ?.sales
                          ?.totalRevenue
                      )}

                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Paid Revenue
                    </span>

                    <span className="font-semibold">

                      {formatMoney(
                        reportData
                          ?.sales
                          ?.paidRevenue
                      )}

                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Pending Revenue
                    </span>

                    <span className="font-semibold text-yellow-400">

                      {formatMoney(
                        reportData
                          ?.sales
                          ?.pendingRevenue
                      )}

                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Total Sales
                    </span>

                    <span className="font-semibold">

                      {reportData
                        ?.sales
                        ?.totalSales || 0}

                    </span>

                  </div>

                </div>

              </div>


              {/* LEADS */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                <h3 className="text-xl font-bold">
                  🎯 Lead Performance
                </h3>

                <div className="space-y-4 mt-6">

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      New
                    </span>

                    <span>
                      {reportData
                        ?.leads
                        ?.new || 0}
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Interested
                    </span>

                    <span className="text-blue-400">

                      {reportData
                        ?.leads
                        ?.interested || 0}

                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Negotiation
                    </span>

                    <span className="text-purple-400">

                      {reportData
                        ?.leads
                        ?.negotiation || 0}

                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Converted
                    </span>

                    <span className="text-green-400">

                      {reportData
                        ?.leads
                        ?.converted || 0}

                    </span>

                  </div>

                </div>

              </div>


              {/* PRODUCTIVITY */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                <h3 className="text-xl font-bold">
                  📋 Productivity
                </h3>

                <div className="space-y-4 mt-6">

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Completed Tasks
                    </span>

                    <span className="text-green-400">

                      {reportData
                        ?.tasks
                        ?.completed || 0}

                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Pending Tasks
                    </span>

                    <span className="text-yellow-400">

                      {reportData
                        ?.tasks
                        ?.pending || 0}

                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Overdue Tasks
                    </span>

                    <span className="text-red-400">

                      {reportData
                        ?.tasks
                        ?.overdue || 0}

                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Completion Rate
                    </span>

                    <span className="text-purple-400">

                      {reportData
                        ?.tasks
                        ?.completionRate || 0}%

                    </span>

                  </div>

                </div>

              </div>

            </div>


            {/* ================================= */}
            {/* FOLLOW-UPS */}
            {/* ================================= */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

                <p className="text-slate-400 text-sm">
                  📞 Pending Follow-ups
                </p>

                <p className="text-3xl font-bold text-blue-400 mt-3">

                  {reportData
                    ?.followUps
                    ?.pending || 0}

                </p>

              </div>

              <div className="bg-slate-900 border border-red-500/30 rounded-xl p-5">

                <p className="text-slate-400 text-sm">
                  🔴 Overdue Follow-ups
                </p>

                <p className="text-3xl font-bold text-red-400 mt-3">

                  {reportData
                    ?.followUps
                    ?.overdue || 0}

                </p>

              </div>

              <div className="bg-slate-900 border border-orange-500/30 rounded-xl p-5">

                <p className="text-slate-400 text-sm">
                  📅 Follow-ups Today
                </p>

                <p className="text-3xl font-bold text-orange-400 mt-3">

                  {reportData
                    ?.followUps
                    ?.dueToday || 0}

                </p>

              </div>

            </div>


            {/* ================================= */}
            {/* AI REPORT */}
            {/* ================================= */}

            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl overflow-hidden">

              <div className="border-b border-purple-500/20 p-6 md:p-8">

                <div className="flex items-center gap-4">

                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-3xl">
                    🤖
                  </div>

                  <div>

                    <h2 className="text-2xl font-bold">
                      BizAI Complete Analysis
                    </h2>

                    <p className="text-slate-400 text-sm mt-1">
                      Personalized recommendations based on your real business data
                    </p>

                  </div>

                </div>

              </div>


              <div className="p-6 md:p-8">

                <div className="bg-slate-950/70 border border-slate-700 rounded-xl p-5 md:p-7 whitespace-pre-wrap leading-8 text-slate-200">

                  {report}

                </div>

              </div>

            </div>


            {/* ================================= */}
            {/* ACTION BUTTONS */}
            {/* ================================= */}

            <div className="flex flex-wrap justify-center gap-4 pb-6">

              <button
                onClick={generateReport}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold"
              >
                🔄 Regenerate Report
              </button>

              <button
                onClick={() =>
                  router.push("/ai-assistant")
                }
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold"
              >
                🤖 Ask BizAI
              </button>

              <button
                onClick={() =>
                  router.push("/dashboard")
                }
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-xl font-semibold"
              >
                📊 Dashboard
              </button>

            </div>

          </div>

        )}

      </div>

    </main>
  );
}


// =====================================
// PROTECTED PAGE
// =====================================

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  );
}