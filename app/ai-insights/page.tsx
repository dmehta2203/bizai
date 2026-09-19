"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  getUserSubscription,
  hasFeatureAccess,
  SubscriptionPlan,
} from "@/lib/subscription";
import Link from "next/link";

type Lead = {
  id: string;
  name: string;
  status: string;
};

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
};

type FollowUp = {
  id: string;
  due_date: string | null;
  completed: boolean;
};

type Sale = {
  id: string;
  amount: number | null;
  payment_status: string;
};

type Insight = {
  id: number;
  type: "success" | "warning" | "danger" | "info";
  icon: string;
  title: string;
  description: string;
};

function AIInsightsContent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [subscriptionPlan, setSubscriptionPlan] =
    useState<SubscriptionPlan>(null);

  const [hasAccess, setHasAccess] =
    useState(false);

  useEffect(() => {
    loadAIInsights();
  }, []);

  // ==========================
  // LOAD BUSINESS DATA
  // ==========================

  async function loadAIInsights(
    isRefresh = false
  ) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // ==========================
      // GET USER
      // ==========================

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      const userId = session.user.id;

      // ==========================
      // CHECK SUBSCRIPTION
      // ==========================

      const subscription =
        await getUserSubscription(userId);

      const plan =
        subscription?.plan || null;

      setSubscriptionPlan(plan);

      const access =
        hasFeatureAccess(
          plan,
          "aiInsights"
        );

      setHasAccess(access);

      if (!access) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // ==========================
      // LOAD DATA
      // ==========================

      const [
        leadsResult,
        tasksResult,
        followUpsResult,
        salesResult,
      ] =
        await Promise.all([

          supabase
            .from("leads")
            .select(
              "id, name, status"
            )
            .eq(
              "user_id",
              userId
            ),

          supabase
            .from("tasks")
            .select(
              "id, title, status, priority, due_date"
            )
            .eq(
              "user_id",
              userId
            ),

          supabase
            .from("follow_ups")
            .select(
              "id, due_date, completed"
            )
            .eq(
              "user_id",
              userId
            ),

          supabase
            .from("sales")
            .select(
              "id, amount, payment_status"
            )
            .eq(
              "user_id",
              userId
            ),

        ]);

      setLeads(
        leadsResult.data || []
      );

      setTasks(
        tasksResult.data || []
      );

      setFollowUps(
        followUpsResult.data || []
      );

      setSales(
        salesResult.data || []
      );

    } catch (error) {

      console.error(
        "AI Insights Error:",
        error
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }
  }

  // ==========================
  // DATE FUNCTIONS
  // ==========================

  function getToday() {

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    return today;
  }

  function isOverdue(
    date: string | null
  ) {

    if (!date) {
      return false;
    }

    const today =
      getToday();

    const itemDate =
      new Date(date);

    itemDate.setHours(
      0,
      0,
      0,
      0
    );

    return itemDate < today;
  }

  // ==========================
  // MONEY FORMAT
  // ==========================

  function formatMoney(
    amount: number
  ) {

    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }
    ).format(amount);

  }

  // ==========================
  // ANALYZE BUSINESS DATA
  // ==========================

  const businessData =
    useMemo(() => {

      const newLeads =
        leads.filter(
          (lead) =>
            lead.status === "New"
        ).length;

      const contactedLeads =
        leads.filter(
          (lead) =>
            lead.status ===
            "Contacted"
        ).length;

      const interestedLeads =
        leads.filter(
          (lead) =>
            lead.status ===
            "Interested"
        ).length;

      const negotiationLeads =
        leads.filter(
          (lead) =>
            lead.status ===
            "Negotiation"
        ).length;

      const convertedLeads =
        leads.filter(
          (lead) =>
            lead.status ===
            "Converted"
        ).length;

      // ========================
      // CONVERSION RATE
      // ========================

      const conversionRate =
        leads.length > 0
          ? Math.round(
              (
                convertedLeads /
                leads.length
              ) *
                100
            )
          : 0;

      // ========================
      // TASKS
      // ========================

      const completedTasks =
        tasks.filter(
          (task) =>
            task.status ===
            "Completed"
        ).length;

      const pendingTasks =
        tasks.filter(
          (task) =>
            task.status ===
            "Pending"
        ).length;

      const overdueTasks =
        tasks.filter(
          (task) =>
            task.status !==
              "Completed" &&
            isOverdue(
              task.due_date
            )
        ).length;

      const highPriorityTasks =
        tasks.filter(
          (task) =>
            task.status !==
              "Completed" &&
            task.priority ===
              "High"
        ).length;

      const taskCompletionRate =
        tasks.length > 0
          ? Math.round(
              (
                completedTasks /
                tasks.length
              ) *
                100
            )
          : 0;

      // ========================
      // FOLLOW UPS
      // ========================

      const completedFollowUps =
        followUps.filter(
          (followUp) =>
            followUp.completed
        ).length;

      const pendingFollowUps =
        followUps.filter(
          (followUp) =>
            !followUp.completed
        ).length;

      const overdueFollowUps =
        followUps.filter(
          (followUp) =>
            !followUp.completed &&
            isOverdue(
              followUp.due_date
            )
        ).length;

      // ========================
      // SALES
      // ========================

      const totalRevenue =
        sales.reduce(
          (
            total,
            sale
          ) =>
            total +
            Number(
              sale.amount || 0
            ),
          0
        );

      const paidRevenue =
        sales
          .filter(
            (sale) =>
              sale.payment_status ===
              "Paid"
          )
          .reduce(
            (
              total,
              sale
            ) =>
              total +
              Number(
                sale.amount || 0
              ),
            0
          );

      const pendingRevenue =
        sales
          .filter(
            (sale) =>
              sale.payment_status ===
              "Pending"
          )
          .reduce(
            (
              total,
              sale
            ) =>
              total +
              Number(
                sale.amount || 0
              ),
            0
          );

      // ========================
      // BUSINESS HEALTH SCORE
      // ========================

      let healthScore = 0;

      // Lead conversion
      healthScore +=
        Math.min(
          conversionRate * 0.3,
          30
        );

      // Task completion
      healthScore +=
        Math.min(
          taskCompletionRate *
            0.25,
          25
        );

      // Follow-ups
      if (
        followUps.length === 0
      ) {

        healthScore += 20;

      } else {

        const followUpScore =
          (
            (
              followUps.length -
              overdueFollowUps
            ) /
            followUps.length
          ) *
          20;

        healthScore +=
          Math.max(
            0,
            followUpScore
          );

      }

      // Payment performance
      if (
        totalRevenue === 0
      ) {

        healthScore += 25;

      } else {

        const paymentScore =
          (
            paidRevenue /
            totalRevenue
          ) *
          25;

        healthScore +=
          paymentScore;

      }

      healthScore =
        Math.round(
          Math.min(
            100,
            healthScore
          )
        );

      return {

        newLeads,
        contactedLeads,
        interestedLeads,
        negotiationLeads,
        convertedLeads,

        conversionRate,

        completedTasks,
        pendingTasks,
        overdueTasks,
        highPriorityTasks,

        taskCompletionRate,

        completedFollowUps,
        pendingFollowUps,
        overdueFollowUps,

        totalRevenue,
        paidRevenue,
        pendingRevenue,

        healthScore,

      };

    }, [
      leads,
      tasks,
      followUps,
      sales,
    ]);

  // ==========================
  // GENERATE AI INSIGHTS
  // ==========================

  const insights =
    useMemo(() => {

      const result:
        Insight[] = [];

      let id = 1;

      // ========================
      // HIGH POTENTIAL LEADS
      // ========================

      const highPotential =
        businessData.interestedLeads +
        businessData.negotiationLeads;

      if (
        highPotential > 0
      ) {

        result.push({
          id: id++,

          type: "success",

          icon: "🔥",

          title:
            "High-Potential Leads Found",

          description:
            `You have ${highPotential} high-potential lead(s). Focus on interested and negotiation-stage leads to increase conversions.`,
        });

      }

      // ========================
      // NEW LEADS
      // ========================

      if (
        businessData.newLeads > 0
      ) {

        result.push({
          id: id++,

          type: "info",

          icon: "🎯",

          title:
            "New Leads Need Attention",

          description:
            `You have ${businessData.newLeads} new lead(s). Contact them quickly to improve your chances of conversion.`,
        });

      }

      // ========================
      // OVERDUE TASKS
      // ========================

      if (
        businessData.overdueTasks >
        0
      ) {

        result.push({
          id: id++,

          type: "danger",

          icon: "🚨",

          title:
            "Overdue Tasks Detected",

          description:
            `You have ${businessData.overdueTasks} overdue task(s). Complete them as soon as possible to keep your business operations on track.`,
        });

      }

      // ========================
      // HIGH PRIORITY TASKS
      // ========================

      if (
        businessData.highPriorityTasks >
        0
      ) {

        result.push({
          id: id++,

          type: "warning",

          icon: "⚡",

          title:
            "High Priority Work",

          description:
            `You have ${businessData.highPriorityTasks} high-priority task(s) that are not completed yet.`,
        });

      }

      // ========================
      // FOLLOW UPS
      // ========================

      if (
        businessData.pendingFollowUps >
        0
      ) {

        result.push({
          id: id++,

          type: "info",

          icon: "📞",

          title:
            "Follow-ups Pending",

          description:
            `You have ${businessData.pendingFollowUps} pending follow-up(s). Regular communication can significantly improve lead conversion.`,
        });

      }

      // ========================
      // OVERDUE FOLLOW UPS
      // ========================

      if (
        businessData.overdueFollowUps >
        0
      ) {

        result.push({
          id: id++,

          type: "danger",

          icon: "⏰",

          title:
            "Overdue Follow-ups",

          description:
            `${businessData.overdueFollowUps} follow-up(s) are overdue. Contact these leads before the opportunity becomes cold.`,
        });

      }

      // ========================
      // PENDING PAYMENTS
      // ========================

      if (
        businessData.pendingRevenue >
        0
      ) {

        result.push({
          id: id++,

          type: "warning",

          icon: "💰",

          title:
            "Pending Revenue",

          description:
            `${formatMoney(businessData.pendingRevenue)} is still pending. Follow up with customers to improve your cash flow.`,
        });

      }

      // ========================
      // CONVERSION RATE
      // ========================

      if (
        leads.length > 0
      ) {

        if (
          businessData.conversionRate >=
          50
        ) {

          result.push({
            id: id++,

            type: "success",

            icon: "📈",

            title:
              "Excellent Lead Conversion",

            description:
              `Your lead conversion rate is ${businessData.conversionRate}%. Your sales process is performing very well!`,
          });

        } else if (
          businessData.conversionRate <
          20
        ) {

          result.push({
            id: id++,

            type: "warning",

            icon: "📉",

            title:
              "Lead Conversion Can Improve",

            description:
              `Your current conversion rate is ${businessData.conversionRate}%. Focus on faster follow-ups and high-potential leads.`,
          });

        }

      }

      // ========================
      // TASK PRODUCTIVITY
      // ========================

      if (
        tasks.length > 0
      ) {

        if (
          businessData.taskCompletionRate >=
          80
        ) {

          result.push({
            id: id++,

            type: "success",

            icon: "🏆",

            title:
              "Excellent Productivity",

            description:
              `Your task completion rate is ${businessData.taskCompletionRate}%. Your team productivity looks strong.`,
          });

        } else if (
          businessData.taskCompletionRate <
          50
        ) {

          result.push({
            id: id++,

            type: "warning",

            icon: "📋",

            title:
              "Task Productivity Needs Attention",

            description:
              `Only ${businessData.taskCompletionRate}% of tasks are completed. Try prioritizing important work.`,
          });

        }

      }

      // ========================
      // BUSINESS HEALTH
      // ========================

      if (
        businessData.healthScore >=
        80
      ) {

        result.push({
          id: id++,

          type: "success",

          icon: "🚀",

          title:
            "Business Performance is Excellent",

          description:
            `Your BizAI Business Health Score is ${businessData.healthScore}/100. Keep maintaining your current performance.`,
        });

      } else if (
        businessData.healthScore <
        50
      ) {

        result.push({
          id: id++,

          type: "danger",

          icon: "⚠️",

          title:
            "Business Needs Attention",

          description:
            `Your Business Health Score is ${businessData.healthScore}/100. Focus on overdue tasks, follow-ups and pending payments.`,
        });

      }

      // ========================
      // NO INSIGHTS
      // ========================

      if (
        result.length === 0
      ) {

        result.push({
          id: id++,

          type: "success",

          icon: "🎉",

          title:
            "Your Business Looks Organized",

          description:
            "Great job! No major issues were detected. Keep managing your leads, tasks and follow-ups regularly.",
        });

      }

      return result;

    }, [
      businessData,
      leads,
      tasks,
    ]);

  // ==========================
  // HEALTH STATUS
  // ==========================

  function getHealthStatus() {

    const score =
      businessData.healthScore;

    if (score >= 80) {

      return {
        label:
          "Excellent",

        emoji:
          "🟢",
      };

    }

    if (score >= 60) {

      return {
        label:
          "Good",

        emoji:
          "🔵",
      };

    }

    if (score >= 40) {

      return {
        label:
          "Needs Attention",

        emoji:
          "🟡",
      };

    }

    return {

      label:
        "Needs Improvement",

      emoji:
        "🔴",

    };

  }

  const healthStatus =
    getHealthStatus();

  // ==========================
  // LOADING
  // ==========================

  if (loading) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-6xl animate-pulse">
            🤖
          </div>

          <h2 className="text-2xl font-bold mt-5">

            BizAI is analyzing your business...

          </h2>

          <p className="text-slate-400 mt-2">

            Checking leads, tasks, sales and follow-ups.

          </p>

        </div>

      </main>

    );

  }

  // ==========================
  // NO ACCESS
  // ==========================

  if (!hasAccess) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

        <div className="max-w-xl w-full bg-slate-900 border border-purple-500/30 rounded-2xl p-8 text-center">

          <div className="text-6xl">
            🔒
          </div>

          <h1 className="text-3xl font-bold mt-5">

            AI Insights Locked

          </h1>

          <p className="text-slate-400 mt-4">

            AI Business Insights is available
            on the Professional and Business plans.

          </p>

          <p className="text-purple-400 mt-3 font-semibold">

            Your current plan:{" "}

            {subscriptionPlan ||
              "No Active Plan"}

          </p>

          <Link
            href="/pricing"
            className="inline-block mt-7 bg-purple-600 hover:bg-purple-700 px-7 py-3 rounded-xl font-semibold transition"
          >

            🚀 Upgrade Your Plan

          </Link>

        </div>

      </main>

    );

  }

  // ==========================
  // MAIN PAGE
  // ==========================

  return (

    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">

          <div>

            <p className="text-purple-400 font-semibold">

              🤖 BIZAI INTELLIGENCE

            </p>

            <h1 className="text-3xl md:text-5xl font-bold mt-2">

              AI Business Insights

            </h1>

            <p className="text-slate-400 mt-3">

              Smart recommendations generated from
              your real business data.

            </p>

          </div>


          <button
            onClick={() =>
              loadAIInsights(true)
            }
            disabled={refreshing}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold transition"
          >

            {refreshing
              ? "🤖 Analyzing..."
              : "🔄 Refresh Insights"}

          </button>

        </div>


        {/* BUSINESS HEALTH */}

        <div className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-slate-900 border border-purple-500/30 rounded-2xl p-6 md:p-8 mb-8">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            <div>

              <p className="text-purple-400 text-sm font-semibold">

                🤖 AI BUSINESS HEALTH SCORE

              </p>

              <h2 className="text-6xl font-bold mt-3">

                {businessData.healthScore}

                <span className="text-2xl text-slate-400">

                  /100

                </span>

              </h2>

              <h3 className="text-xl font-semibold mt-3">

                {healthStatus.emoji}{" "}

                {healthStatus.label}

              </h3>

            </div>


            <div className="bg-slate-950/60 border border-slate-700 rounded-xl p-5 min-w-[260px]">

              <p className="text-slate-400 text-sm">

                AI Summary

              </p>

              <p className="font-semibold mt-3">

                {businessData.healthScore >= 80
                  ? "Your business is performing very well. Keep maintaining your current strategy!"
                  : businessData.healthScore >= 60
                  ? "Your business is doing well, but a few areas can be improved."
                  : "BizAI detected important areas that need your attention."}

              </p>

            </div>

          </div>

        </div>


        {/* BUSINESS SUMMARY */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

          <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">

            <p className="text-blue-400">

              🎯 Lead Conversion

            </p>

            <p className="text-3xl font-bold mt-3">

              {businessData.conversionRate}%

            </p>

          </div>


          <div className="bg-slate-900 border border-green-500/30 rounded-xl p-5">

            <p className="text-green-400">

              💰 Paid Revenue

            </p>

            <p className="text-2xl font-bold mt-3">

              {formatMoney(
                businessData.paidRevenue
              )}

            </p>

          </div>


          <div className="bg-slate-900 border border-yellow-500/30 rounded-xl p-5">

            <p className="text-yellow-400">

              📋 Task Completion

            </p>

            <p className="text-3xl font-bold mt-3">

              {businessData.taskCompletionRate}%

            </p>

          </div>


          <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5">

            <p className="text-purple-400">

              🔥 High Potential Leads

            </p>

            <p className="text-3xl font-bold mt-3">

              {businessData.interestedLeads +
                businessData.negotiationLeads}

            </p>

          </div>

        </div>


        {/* AI INSIGHTS */}

        <div className="mb-6">

          <h2 className="text-2xl font-bold">

            🤖 Smart Recommendations

          </h2>

          <p className="text-slate-400 mt-2">

            BizAI analyzed your business and found these insights.

          </p>

        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {insights.map(
            (insight) => (

              <div
                key={insight.id}

                className={`rounded-2xl border p-6 transition hover:-translate-y-1 ${
                  insight.type === "success"
                    ? "bg-green-500/5 border-green-500/30"
                    : insight.type === "danger"
                    ? "bg-red-500/5 border-red-500/30"
                    : insight.type === "warning"
                    ? "bg-yellow-500/5 border-yellow-500/30"
                    : "bg-blue-500/5 border-blue-500/30"
                }`}
              >

                <div className="flex gap-4">

                  <div className="text-4xl">

                    {insight.icon}

                  </div>


                  <div>

                    <h3 className="text-lg font-bold">

                      {insight.title}

                    </h3>

                    <p className="text-slate-400 mt-2 leading-relaxed">

                      {insight.description}

                    </p>

                  </div>

                </div>

              </div>

            )
          )}

        </div>


        {/* BUSINESS ACTION PLAN */}

        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">

          <h2 className="text-2xl font-bold">

            🎯 Recommended Action Plan

          </h2>

          <p className="text-slate-400 mt-2">

            Follow these steps to improve your business performance.

          </p>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">

            <div className="bg-slate-950 rounded-xl p-5">

              <div className="text-3xl">

                1️⃣

              </div>

              <h3 className="font-bold mt-3">

                Focus on Leads

              </h3>

              <p className="text-slate-400 text-sm mt-2">

                Contact new and interested leads quickly.

              </p>

            </div>


            <div className="bg-slate-950 rounded-xl p-5">

              <div className="text-3xl">

                2️⃣

              </div>

              <h3 className="font-bold mt-3">

                Complete Important Tasks

              </h3>

              <p className="text-slate-400 text-sm mt-2">

                Prioritize overdue and high-priority work.

              </p>

            </div>


            <div className="bg-slate-950 rounded-xl p-5">

              <div className="text-3xl">

                3️⃣

              </div>

              <h3 className="font-bold mt-3">

                Improve Cash Flow

              </h3>

              <p className="text-slate-400 text-sm mt-2">

                Follow up on pending payments and customers.

              </p>

            </div>

          </div>

        </div>


        {/* FOOTER */}

        <div className="text-center text-slate-500 text-sm mt-10 pb-5">

          🤖 BizAI Intelligence • Smart insights powered by your real business data

        </div>

      </div>

    </main>

  );
}


// ==========================
// PROTECTED PAGE
// ==========================

export default function AIInsightsPage() {

  return (

    <ProtectedRoute>

      <AIInsightsContent />

    </ProtectedRoute>

  );

}