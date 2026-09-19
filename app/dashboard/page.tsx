"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Lead = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
};

type FollowUp = {
  id: string;
  lead_id: string | null;
  title: string;
  due_date: string;
  completed: boolean;
};

type Sale = {
  id: string;
  amount: number;
  payment_status: string;
  created_at?: string;
};

type DashboardData = {
  totalLeads: number;
  newLeads: number;
  interestedLeads: number;
  negotiationLeads: number;
  convertedLeads: number;

  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;

  followUpsToday: number;
  overdueFollowUps: number;
  pendingFollowUps: number;

  totalRevenue: number;
  pendingRevenue: number;
  paidRevenue: number;

  healthScore: number;
};

type RevenueChartItem = {
  date: string;
  revenue: number;
};

type LeadChartItem = {
  status: string;
  count: number;
};

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [data, setData] =
    useState<DashboardData | null>(null);

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [followUps, setFollowUps] =
    useState<FollowUp[]>([]);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [
    revenueChartData,
    setRevenueChartData,
  ] =
    useState<RevenueChartItem[]>([]);

  const [
    leadChartData,
    setLeadChartData,
  ] =
    useState<LeadChartItem[]>([]);

  const [aiInsight, setAiInsight] =
    useState("");

  const [aiLoading, setAiLoading] =
    useState(false);

  const [
    salesMenuOpen,
    setSalesMenuOpen,
  ] =
    useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  // ======================
  // GET TODAY DATE
  // ======================

  function getTodayDate() {
    const today = new Date();

    const year =
      today.getFullYear();

    const month = String(
      today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // ======================
  // FORMAT CHART DATE
  // ======================

  function formatChartDate(
    date: string
  ) {
    return new Date(
      date
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
      }
    );
  }

  // ======================
  // LOAD DASHBOARD
  // ======================

  async function loadDashboard() {
    try {
      setLoading(true);

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      const userId =
        session.user.id;

      // ======================
      // CHECK NOTIFICATIONS
      // ======================

      try {
        if (session.access_token) {
          await fetch(
            "/api/notifications/check",
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
        }
      } catch (error) {
        console.error(
          "Notification error:",
          error
        );
      }

      // ======================
      // LOAD BUSINESS DATA
      // ======================

      const [
        leadsResult,
        tasksResult,
        followUpsResult,
        salesResult,
      ] =
        await Promise.all([

          supabase
            .from("leads")
            .select("*")
            .eq(
              "user_id",
              userId
            ),

          supabase
            .from("tasks")
            .select("*")
            .eq(
              "user_id",
              userId
            ),

          supabase
            .from("follow_ups")
            .select("*")
            .eq(
              "user_id",
              userId
            ),

          supabase
            .from("sales")
            .select("*")
            .eq(
              "user_id",
              userId
            ),

        ]);

      const leadsData =
        leadsResult.data || [];

      const tasksData =
        tasksResult.data || [];

      const followUpsData =
        followUpsResult.data || [];

      const salesData =
        salesResult.data || [];

      setLeads(leadsData);
      setTasks(tasksData);
      setFollowUps(followUpsData);
      setSales(salesData);

      // ======================
      // TODAY
      // ======================

      const todayString =
        getTodayDate();

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      // ======================
      // LEAD STATISTICS
      // ======================

      const totalLeads =
        leadsData.length;

      const newLeads =
        leadsData.filter(
          (lead) =>
            lead.status === "New"
        ).length;

      const interestedLeads =
        leadsData.filter(
          (lead) =>
            lead.status ===
            "Interested"
        ).length;

      const negotiationLeads =
        leadsData.filter(
          (lead) =>
            lead.status ===
            "Negotiation"
        ).length;

      const convertedLeads =
        leadsData.filter(
          (lead) =>
            lead.status ===
            "Converted"
        ).length;

      // ======================
      // TASK STATISTICS
      // ======================

      const totalTasks =
        tasksData.length;

      const pendingTasks =
        tasksData.filter(
          (task) =>
            task.status ===
            "Pending"
        ).length;

      const completedTasks =
        tasksData.filter(
          (task) =>
            task.status ===
            "Completed"
        ).length;

      const overdueTasks =
        tasksData.filter(
          (task) => {

            if (
              !task.due_date ||
              task.status ===
                "Completed"
            ) {
              return false;
            }

            const dueDate =
              new Date(
                task.due_date
              );

            dueDate.setHours(
              0,
              0,
              0,
              0
            );

            return dueDate < today;
          }
        ).length;

      // ======================
      // FOLLOW-UP STATISTICS
      // ======================

      const pendingFollowUps =
        followUpsData.filter(
          (followUp) =>
            !followUp.completed
        ).length;

      const followUpsToday =
        followUpsData.filter(
          (followUp) =>
            !followUp.completed &&
            followUp.due_date ===
              todayString
        ).length;

      const overdueFollowUps =
        followUpsData.filter(
          (followUp) => {

            if (
              followUp.completed
            ) {
              return false;
            }

            return (
              followUp.due_date <
              todayString
            );
          }
        ).length;

      // ======================
      // SALES STATISTICS
      // ======================

      const totalRevenue =
        salesData.reduce(
          (total, sale) =>
            total +
            Number(
              sale.amount || 0
            ),
          0
        );

      const paidRevenue =
        salesData
          .filter(
            (sale) =>
              sale.payment_status ===
              "Paid"
          )
          .reduce(
            (total, sale) =>
              total +
              Number(
                sale.amount || 0
              ),
            0
          );

      const pendingRevenue =
        salesData
          .filter(
            (sale) =>
              sale.payment_status ===
              "Pending"
          )
          .reduce(
            (total, sale) =>
              total +
              Number(
                sale.amount || 0
              ),
            0
          );

      // ======================
      // BUSINESS HEALTH SCORE
      // ======================

      let healthScore = 100;

      healthScore -=
        overdueTasks * 10;

      healthScore -=
        overdueFollowUps * 10;

      healthScore -=
        Math.min(
          pendingTasks * 3,
          20
        );

      healthScore -=
        Math.min(
          newLeads * 2,
          10
        );

      if (healthScore < 0) {
        healthScore = 0;
      }

      // ======================
      // SET DASHBOARD DATA
      // ======================

      setData({

        totalLeads,
        newLeads,
        interestedLeads,
        negotiationLeads,
        convertedLeads,

        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,

        followUpsToday,
        overdueFollowUps,
        pendingFollowUps,

        totalRevenue,
        pendingRevenue,
        paidRevenue,

        healthScore,

      });

      // ======================
      // REVENUE ANALYTICS
      // ======================

      const revenueMap:
        Record<string, number> =
        {};

      salesData.forEach(
        (sale) => {

          if (!sale.created_at) {
            return;
          }

          const date =
            sale.created_at
              .split("T")[0];

          revenueMap[date] =
            (
              revenueMap[date] ||
              0
            ) +
            Number(
              sale.amount || 0
            );

        }
      );

      const revenueData =
        Object.entries(
          revenueMap
        )
          .sort(
            ([a], [b]) =>
              new Date(a).getTime() -
              new Date(b).getTime()
          )
          .slice(-7)
          .map(
            ([
              date,
              revenue,
            ]) => ({
              date:
                formatChartDate(
                  date
                ),

              revenue,
            })
          );

      setRevenueChartData(
        revenueData
      );

      // ======================
      // LEAD ANALYTICS
      // ======================

      setLeadChartData([

        {
          status: "New",
          count: newLeads,
        },

        {
          status: "Interested",
          count:
            interestedLeads,
        },

        {
          status:
            "Negotiation",

          count:
            negotiationLeads,
        },

        {
          status:
            "Converted",

          count:
            convertedLeads,
        },

      ]);

    } catch (error) {

      console.error(
        "Dashboard error:",
        error
      );

    } finally {

      setLoading(false);

    }
  }

  // ======================
  // FORMAT MONEY
  // ======================

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

  // ======================
  // HEALTH STATUS
  // ======================

  function getHealthStatus(
    score: number
  ) {

    if (score >= 80) {
      return {
        text: "Excellent",

        emoji: "🟢",

        color:
          "text-green-400",
      };
    }

    if (score >= 60) {
      return {
        text: "Good",

        emoji: "🟡",

        color:
          "text-yellow-400",
      };
    }

    if (score >= 40) {
      return {
        text:
          "Needs Attention",

        emoji: "🟠",

        color:
          "text-orange-400",
      };
    }

    return {
      text: "Critical",

      emoji: "🔴",

      color:
        "text-red-400",
    };
  }

  // ======================
  // PRIORITY LEADS
  // ======================

  function getPriorityLeads() {

    return leads
      .filter(
        (lead) =>
          lead.status ===
            "Interested" ||
          lead.status ===
            "Negotiation" ||
          lead.status === "New"
      )
      .sort(
        (a, b) => {

          const priority = {

            Negotiation: 1,

            Interested: 2,

            New: 3,

          };

          return (
            priority[
              a.status as keyof
              typeof priority
            ] -
            priority[
              b.status as keyof
              typeof priority
            ]
          );

        }
      )
      .slice(0, 5);
  }

  // ======================
  // GENERATE AI INSIGHT
  // ======================

  async function generateAIInsight() {

    if (!data) {
      return;
    }

    setAiLoading(true);

    try {

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session?.user) {

        router.push("/login");

        return;
      }

      // ======================
      // SECURE AI REQUEST
      // ======================

      if (!session.access_token) {

        setAiInsight(
          "Your authentication session is missing. Please log in again."
        );

        await supabase.auth.signOut();

        router.push("/login");

        return;
      }

      const response =
        await fetch(
          "/api/ai",
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

                message:
                  "Generate smart daily business insights. Analyze my business performance, identify urgent priorities and give me actionable recommendations for today.",

                messages: [],

                mode:
                  "dashboard",

              }),

          }
        );

      const result =
        await response.json();

      if (!response.ok) {

        throw new Error(
          result.error ||
          "Unable to generate insights."
        );
      }

      if (result.response) {

        setAiInsight(
          result.response
        );

      } else {

        setAiInsight(
          "Unable to generate AI insights right now."
        );

      }

    } catch (error: any) {

      console.error(error);

      setAiInsight(
        error.message ||
        "Something went wrong while generating insights."
      );

    } finally {

      setAiLoading(false);

    }
  }

  // ======================
  // LOADING
  // ======================

  if (loading) {

    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-4">
            🤖
          </div>

          <p className="text-slate-400">
            BizAI is analyzing your business...
          </p>

        </div>

      </main>
    );
  }

  if (!data) {
    return null;
  }

  const health =
    getHealthStatus(
      data.healthScore
    );

  const priorityLeads =
    getPriorityLeads();

  return (

    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">

        {/* ======================
            HEADER
        ====================== */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>

            <h1 className="text-3xl md:text-4xl font-bold">
              🌅 Smart Daily Dashboard
            </h1>

            <p className="text-slate-400 mt-2">
              Your AI-powered business priorities for today
            </p>

          </div>

          {/* ONLY ASK BIZAI + REFRESH */}

          <div className="flex flex-wrap gap-3">

            <button
              onClick={() =>
                router.push(
                  "/ai-assistant"
                )
              }
              className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold"
            >
              🤖 Ask BizAI
            </button>

            <button
              onClick={
                loadDashboard
              }
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-3 rounded-xl"
            >
              🔄 Refresh
            </button>

          </div>

        </div>

        {/* ======================
            BUSINESS HEALTH
        ====================== */}

        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-6 md:p-8 mb-8">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            <div>

              <p className="text-slate-400 mb-2">
                📊 BUSINESS HEALTH SCORE
              </p>

              <div className="flex items-center gap-4">

                <h2 className="text-5xl font-bold">

                  {data.healthScore}

                  <span className="text-2xl text-slate-400">
                    /100
                  </span>

                </h2>

                <div>

                  <p
                    className={`font-semibold ${health.color}`}
                  >
                    {health.emoji}{" "}
                    {health.text}
                  </p>

                  <p className="text-slate-400 text-sm">
                    Based on your business activity
                  </p>

                </div>

              </div>

            </div>

            <div className="text-5xl">
              🤖📊
            </div>

          </div>

        </div>

        {/* ======================
            QUICK STATS
        ====================== */}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              🎯 Leads
            </p>

            <p className="text-3xl font-bold text-blue-400 mt-2">
              {data.totalLeads}
            </p>

          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              📞 Follow-ups
            </p>

            <p className="text-3xl font-bold text-purple-400 mt-2">
              {data.pendingFollowUps}
            </p>

          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              📋 Pending Tasks
            </p>

            <p className="text-3xl font-bold text-yellow-400 mt-2">
              {data.pendingTasks}
            </p>

          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              💰 Revenue
            </p>

            <p className="text-xl font-bold text-green-400 mt-2">
              {formatMoney(
                data.totalRevenue
              )}
            </p>

          </div>

        </div>

        {/* ======================
            ANALYTICS
        ====================== */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* REVENUE CHART */}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-xl font-bold">
              📈 Revenue Analytics
            </h2>

            <p className="text-slate-400 text-sm mt-1 mb-6">
              Revenue from your latest sales
            </p>

            {revenueChartData.length === 0 ? (

              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No sales data available yet.
              </div>

            ) : (

              <div className="h-[300px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <LineChart
                    data={
                      revenueChartData
                    }
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                    />

                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                    />

                    <YAxis
                      stroke="#94a3b8"
                    />

                    <Tooltip
                      formatter={(
                        value
                      ) =>
                        formatMoney(
                          Number(value)
                        )
                      }
                    />

                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#22c55e"
                      strokeWidth={3}
                    />

                  </LineChart>

                </ResponsiveContainer>

              </div>

            )}

          </div>

          {/* LEAD CHART */}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-xl font-bold">
              🎯 Lead Analytics
            </h2>

            <p className="text-slate-400 text-sm mt-1 mb-6">
              Your current lead pipeline
            </p>

            <div className="h-[300px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={
                    leadChartData
                  }
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                  />

                  <XAxis
                    dataKey="status"
                    stroke="#94a3b8"
                  />

                  <YAxis
                    stroke="#94a3b8"
                  />

                  <Tooltip />

                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

        </div>

        {/* ======================
            TODAY PRIORITIES
        ====================== */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6">

            <h2 className="text-xl font-bold mb-5">
              🔥 Today's Top Priorities
            </h2>

            <div className="space-y-4">

              {data.overdueFollowUps > 0 && (

                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">

                  <p className="font-semibold text-red-400">
                    🔴 Overdue Follow-ups
                  </p>

                  <p className="text-slate-400 text-sm mt-1">
                    You have {data.overdueFollowUps} overdue follow-ups.
                    Contact these leads immediately.
                  </p>

                </div>

              )}

              {data.followUpsToday > 0 && (

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">

                  <p className="font-semibold text-orange-400">
                    🟠 Follow-ups Due Today
                  </p>

                  <p className="text-slate-400 text-sm mt-1">
                    {data.followUpsToday} follow-ups need your attention today.
                  </p>

                </div>

              )}

              {data.overdueTasks > 0 && (

                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">

                  <p className="font-semibold text-red-400">
                    🚨 Overdue Tasks
                  </p>

                  <p className="text-slate-400 text-sm mt-1">
                    {data.overdueTasks} tasks are overdue.
                  </p>

                </div>

              )}

              {data.pendingRevenue > 0 && (

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">

                  <p className="font-semibold text-yellow-400">
                    💰 Pending Payments
                  </p>

                  <p className="text-slate-400 text-sm mt-1">
                    {formatMoney(data.pendingRevenue)} is waiting for collection.
                  </p>

                </div>

              )}

              {data.overdueFollowUps === 0 &&
                data.followUpsToday === 0 &&
                data.overdueTasks === 0 &&
                data.pendingRevenue === 0 && (

                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">

                    <p className="font-semibold text-green-400">
                      🟢 Everything Looks Good!
                    </p>

                    <p className="text-slate-400 text-sm mt-1">
                      No urgent business issues today.
                    </p>

                  </div>

                )}

            </div>

          </div>

          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6">

            <h2 className="text-xl font-bold mb-5">
              🎯 Leads To Focus On
            </h2>

            {priorityLeads.length === 0 ? (

              <p className="text-slate-400">
                No active leads yet.
              </p>

            ) : (

              <div className="space-y-3">

                {priorityLeads.map(
                  (lead) => (

                    <div
                      key={lead.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex justify-between items-center"
                    >

                      <div>

                        <p className="font-semibold">
                          👤 {lead.name}
                        </p>

                        <p className="text-slate-400 text-sm">
                          {lead.status}
                        </p>

                      </div>

                      <span className="text-sm bg-blue-600 px-3 py-1 rounded-full">
                        Focus
                      </span>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        </div>

        {/* ======================
            BUSINESS OVERVIEW
        ====================== */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          {/* LEADS */}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-lg font-bold mb-5">
              🎯 Lead Pipeline
            </h2>

            <div className="space-y-3 text-sm">

              <div className="flex justify-between">

                <span className="text-slate-400">
                  New
                </span>

                <span>
                  {data.newLeads}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Interested
                </span>

                <span>
                  {data.interestedLeads}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Negotiation
                </span>

                <span>
                  {data.negotiationLeads}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Converted
                </span>

                <span className="text-green-400">
                  {data.convertedLeads}
                </span>

              </div>

            </div>

          </div>

          {/* TASKS */}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-lg font-bold mb-5">
              📋 Task Status
            </h2>

            <div className="space-y-3 text-sm">

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Total
                </span>

                <span>
                  {data.totalTasks}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Pending
                </span>

                <span className="text-yellow-400">
                  {data.pendingTasks}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Completed
                </span>

                <span className="text-green-400">
                  {data.completedTasks}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Overdue
                </span>

                <span className="text-red-400">
                  {data.overdueTasks}
                </span>

              </div>

            </div>

          </div>

          {/* SALES */}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <div className="flex items-center justify-between mb-5">

              <h2 className="text-lg font-bold">
                💰 Sales
              </h2>

              <div className="relative">

                <button
                  onClick={() =>
                    setSalesMenuOpen(
                      !salesMenuOpen
                    )
                  }
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg text-sm transition"
                >
                  Options ▾
                </button>

                {salesMenuOpen && (

                  <div className="absolute right-0 top-12 w-48 bg-slate-950 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-20">

                    <button
                      onClick={() => {
                        router.push(
                          "/sales"
                        );

                        setSalesMenuOpen(
                          false
                        );
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800 transition"
                    >
                      💰 Manage Sales
                    </button>

                    <button
                      onClick={() => {
                        router.push(
                          "/sales-analytics"
                        );

                        setSalesMenuOpen(
                          false
                        );
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800 transition border-t border-slate-800"
                    >
                      📊 Sales Analytics
                    </button>

                  </div>

                )}

              </div>

            </div>

            <div className="space-y-3 text-sm">

              <div>

                <p className="text-slate-400">
                  Total Revenue
                </p>

                <p className="text-xl font-bold text-green-400">
                  {formatMoney(
                    data.totalRevenue
                  )}
                </p>

              </div>

              <div>

                <p className="text-slate-400">
                  Paid
                </p>

                <p className="font-semibold">
                  {formatMoney(
                    data.paidRevenue
                  )}
                </p>

              </div>

              <div>

                <p className="text-slate-400">
                  Pending
                </p>

                <p className="font-semibold text-yellow-400">
                  {formatMoney(
                    data.pendingRevenue
                  )}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* ======================
            AI INSIGHTS
        ====================== */}

        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-6 md:p-8">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

            <div>

              <h2 className="text-2xl font-bold">
                🤖 BizAI Smart Insights
              </h2>

              <p className="text-slate-400 mt-1">
                Let AI analyze your business and tell you
                what to focus on.
              </p>

            </div>

            <button
              onClick={
                generateAIInsight
              }
              disabled={
                aiLoading
              }
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold"
            >

              {aiLoading
                ? "🤖 Analyzing..."
                : "✨ Generate Insights"}

            </button>

          </div>

          {aiInsight ? (

            <div className="bg-slate-950/70 border border-slate-700 rounded-xl p-5 whitespace-pre-line text-slate-300">
              {aiInsight}
            </div>

          ) : (

            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-5 text-slate-400">

              Click "Generate Insights" to get personalized
              AI business recommendations.

            </div>

          )}

        </div>

      </div>

    </main>

  );
}