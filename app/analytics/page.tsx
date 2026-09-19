"use client";

import FeatureGuard from "@/components/FeatureGuard";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type Lead = {
  id: string;
  name: string;
  status: string;
};

type Customer = {
  id: string;
};

type Task = {
  id: string;
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

type Subscription = {
  id: string;
  plan: string;
  status: string;
  billing_cycle: string;
  current_period_start: string | null;
  current_period_end: string | null;
};

// ======================================
// ANALYTICS CONTENT
// ======================================

function AnalyticsContent() {

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [followUps, setFollowUps] =
    useState<FollowUp[]>([]);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [subscriptionChecking, setSubscriptionChecking] =
    useState(true);

  const [hasActiveSubscription, setHasActiveSubscription] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);


  // ======================================
  // CHECK SUBSCRIPTION FIRST
  // ======================================

  useEffect(() => {

    checkSubscription();

  }, []);


  // ======================================
  // CHECK USER SUBSCRIPTION
  // ======================================

  async function checkSubscription() {

    try {

      setSubscriptionChecking(true);

      const {
        data: { session },
      } =
        await supabase.auth.getSession();


      // USER NOT LOGGED IN

      if (!session?.user) {

        window.location.href =
          "/login";

        return;

      }


      const userId =
        session.user.id;


      // ======================================
      // GET ACTIVE SUBSCRIPTION
      // ======================================

      const {
        data: subscriptions,
        error,
      } =
        await supabase
          .from("subscriptions")
          .select(`
            id,
            plan,
            status,
            billing_cycle,
            current_period_start,
            current_period_end
          `)
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
          );


      if (error) {

        console.error(
          "Subscription error:",
          error
        );

        window.location.href =
          "/pricing";

        return;

      }


      // ======================================
      // NO SUBSCRIPTION
      // ======================================

      if (
        !subscriptions ||
        subscriptions.length === 0
      ) {

        window.location.href =
          "/pricing";

        return;

      }


      // ======================================
      // CHECK EXPIRY DATE
      // ======================================

      const now =
        new Date();


      const activeSubscription =
        subscriptions.find(
          (
            subscription:
              Subscription
          ) => {

            // If no expiry date,
            // allow subscription

            if (
              !subscription.current_period_end
            ) {

              return true;

            }


            const expiryDate =
              new Date(
                subscription.current_period_end
              );


            return (
              expiryDate >= now
            );

          }
        );


      // ======================================
      // SUBSCRIPTION EXPIRED
      // ======================================

      if (
        !activeSubscription
      ) {

        window.location.href =
          "/pricing";

        return;

      }


      // ======================================
      // SUBSCRIPTION VALID
      // ======================================

      setHasActiveSubscription(
        true
      );


      setSubscriptionChecking(
        false
      );


      // LOAD ANALYTICS DATA

      loadAnalytics();


    } catch (error) {

      console.error(
        "Subscription check error:",
        error
      );

      window.location.href =
        "/pricing";

    }

  }


  // ======================================
  // LOAD ANALYTICS
  // ======================================

  async function loadAnalytics(
    isRefresh = false
  ) {

    if (isRefresh) {

      setRefreshing(true);

    } else {

      setLoading(true);

    }


    try {

      const {
        data: { session },
      } =
        await supabase.auth.getSession();


      if (!session?.user) {

        window.location.href =
          "/login";

        return;

      }


      const userId =
        session.user.id;


      const [

        leadsResult,

        customersResult,

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
            .from("customers")
            .select("id")
            .eq(
              "user_id",
              userId
            ),


          supabase
            .from("tasks")
            .select(
              "id, status, priority, due_date"
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


      setCustomers(
        customersResult.data || []
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
        "Analytics loading error:",
        error
      );

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  }


  // ======================================
  // LOGOUT
  // ======================================

  async function handleLogout() {

    setLoggingOut(true);

    try {

      await supabase.auth.signOut();

      window.location.href =
        "/";

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

      setLoggingOut(false);

    }

  }


  // ======================================
  // GET TODAY
  // ======================================

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


  // ======================================
  // CHECK OVERDUE
  // ======================================

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


    return (
      itemDate < today
    );

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
        style: "currency",

        currency: "INR",

        maximumFractionDigits:
          0,
      }
    ).format(amount);

  }


  // ======================================
  // ANALYTICS CALCULATIONS
  // ======================================

  const analytics =
    useMemo(() => {


      // LEADS

      const newLeads =
        leads.filter(
          (lead) =>
            lead.status ===
            "New"
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


      // TASKS

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


      // FOLLOW UPS

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


      // SALES

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


      const averageSale =
        sales.length > 0
          ? totalRevenue /
            sales.length
          : 0;


      // ======================================
      // BUSINESS HEALTH SCORE
      // ======================================

      let healthScore =
        100;


      healthScore -=
        overdueTasks * 10;


      healthScore -=
        overdueFollowUps * 10;


      healthScore -=
        Math.min(
          pendingTasks * 3,
          15
        );


      if (
        totalRevenue > 0
      ) {

        const paymentRate =
          (
            paidRevenue /
            totalRevenue
          ) *
          100;


        if (
          paymentRate < 50
        ) {

          healthScore -= 10;

        }

      }


      healthScore =
        Math.max(
          0,
          Math.round(
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

        taskCompletionRate,


        completedFollowUps,

        pendingFollowUps,

        overdueFollowUps,


        totalRevenue,

        paidRevenue,

        pendingRevenue,

        averageSale,


        healthScore,

      };

    }, [

      leads,

      tasks,

      followUps,

      sales,

    ]);


  // ======================================
  // CHART DATA
  // ======================================

  const leadChartData = [

    {
      name: "New",
      value:
        analytics.newLeads,
    },

    {
      name: "Contacted",
      value:
        analytics.contactedLeads,
    },

    {
      name: "Interested",
      value:
        analytics.interestedLeads,
    },

    {
      name: "Negotiation",
      value:
        analytics.negotiationLeads,
    },

    {
      name: "Converted",
      value:
        analytics.convertedLeads,
    },

  ];


  const revenueChartData = [

    {
      name: "Paid",
      value:
        analytics.paidRevenue,
    },

    {
      name: "Pending",
      value:
        analytics.pendingRevenue,
    },

  ];


  const taskChartData = [

    {
      name: "Completed",
      value:
        analytics.completedTasks,
    },

    {
      name: "Pending",
      value:
        analytics.pendingTasks,
    },

    {
      name: "Overdue",
      value:
        analytics.overdueTasks,
    },

  ];


  const followUpChartData = [

    {
      name: "Completed",
      value:
        analytics.completedFollowUps,
    },

    {
      name: "Pending",
      value:
        analytics.pendingFollowUps,
    },

    {
      name: "Overdue",
      value:
        analytics.overdueFollowUps,
    },

  ];


  const revenueColors = [

    "#22c55e",

    "#f59e0b",

  ];


  const taskColors = [

    "#22c55e",

    "#3b82f6",

    "#ef4444",

  ];


  // ======================================
  // HEALTH STATUS
  // ======================================

  function getHealthStatus() {

    const score =
      analytics.healthScore;


    if (score >= 80) {

      return {

        label:
          "Excellent",

        emoji:
          "🟢",

        description:
          "Your business is performing very well!",

      };

    }


    if (score >= 60) {

      return {

        label:
          "Good",

        emoji:
          "🔵",

        description:
          "Your business is doing well, but there is room for improvement.",

      };

    }


    if (score >= 40) {

      return {

        label:
          "Needs Attention",

        emoji:
          "🟡",

        description:
          "Some important areas need your attention.",

      };

    }


    return {

      label:
        "Needs Improvement",

      emoji:
        "🔴",

      description:
        "Focus on overdue work, follow-ups and sales opportunities.",

    };

  }


  const healthStatus =
    getHealthStatus();


  // ======================================
  // SUBSCRIPTION LOADING
  // ======================================

  if (
    subscriptionChecking
  ) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-4 animate-pulse">

            🔐

          </div>

          <h2 className="text-xl font-semibold">

            Checking your subscription...

          </h2>

          <p className="text-slate-400 mt-2">

            Please wait while we verify your BizAI plan.

          </p>

        </div>

      </main>

    );

  }


  // ======================================
  // NO SUBSCRIPTION
  // ======================================

  if (
    !hasActiveSubscription
  ) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <h2 className="text-2xl font-bold">

            🔒 Subscription Required

          </h2>

          <p className="text-slate-400 mt-3">

            Please choose a BizAI plan to access analytics.

          </p>

          <button
            onClick={() =>
              window.location.href =
                "/pricing"
            }
            className="mt-6 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold"
          >

            View Plans

          </button>

        </div>

      </main>

    );

  }


  // ======================================
  // ANALYTICS LOADING
  // ======================================

  if (loading) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-4">

            📊

          </div>

          <h2 className="text-xl font-semibold">

            Loading BizAI Analytics...

          </h2>

          <p className="text-slate-400 mt-2">

            Analyzing your business data.

          </p>

        </div>

      </main>

    );

  }


  // ======================================
  // MAIN PAGE
  // ======================================

  return (

    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">


        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>

            <h1 className="text-3xl md:text-4xl font-bold">

              📊 Smart Business Analytics

            </h1>

            <p className="text-slate-400 mt-2">

              Real-time insights powered by your
              BizAI business data.

            </p>

          </div>


          <div className="flex flex-wrap gap-3">

            <button
              onClick={() =>
                loadAnalytics(true)
              }
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-3 rounded-xl font-semibold"
            >

              {refreshing
                ? "🔄 Refreshing..."
                : "🔄 Refresh Data"}

            </button>


            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-5 py-3 rounded-xl font-semibold"
            >

              {loggingOut
                ? "Logging Out..."
                : "🚪 Logout"}

            </button>

          </div>

        </div>


        {/* BUSINESS HEALTH */}

        <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-slate-900 border border-blue-500/30 rounded-2xl p-6 md:p-8 mb-8">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            <div>

              <p className="text-blue-400 text-sm font-semibold">

                🤖 BIZAI BUSINESS HEALTH SCORE

              </p>


              <h2 className="text-5xl font-bold mt-3">

                {analytics.healthScore}

                <span className="text-2xl text-slate-400">

                  /100

                </span>

              </h2>


              <h3 className="text-xl font-semibold mt-3">

                {healthStatus.emoji}{" "}

                {healthStatus.label}

              </h3>


              <p className="text-slate-300 mt-2">

                {healthStatus.description}

              </p>

            </div>


            <div className="bg-slate-950/50 border border-slate-700 rounded-2xl p-6 min-w-[220px]">

              <p className="text-slate-400 text-sm">

                Quick Insight

              </p>


              <p className="text-lg font-semibold mt-3">

                {analytics.overdueTasks > 0

                  ? `🚨 ${analytics.overdueTasks} overdue task(s) need attention.`

                  : analytics.pendingFollowUps > 0

                  ? `📞 You have ${analytics.pendingFollowUps} pending follow-up(s).`

                  : "🎉 Your business tasks are under control!"}

              </p>

            </div>

          </div>

        </div>


        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">


          <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">

            <p className="text-blue-400 text-sm">

              🎯 Total Leads

            </p>

            <p className="text-3xl font-bold mt-2">

              {leads.length}

            </p>

            <p className="text-slate-400 text-sm mt-2">

              {analytics.conversionRate}% conversion

            </p>

          </div>


          <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5">

            <p className="text-purple-400 text-sm">

              👥 Customers

            </p>

            <p className="text-3xl font-bold mt-2">

              {customers.length}

            </p>

            <p className="text-slate-400 text-sm mt-2">

              Active business customers

            </p>

          </div>


          <div className="bg-slate-900 border border-green-500/30 rounded-xl p-5">

            <p className="text-green-400 text-sm">

              💰 Total Revenue

            </p>

            <p className="text-2xl font-bold mt-2">

              {formatMoney(
                analytics.totalRevenue
              )}

            </p>

            <p className="text-slate-400 text-sm mt-2">

              {sales.length} total sales

            </p>

          </div>


          <div className="bg-slate-900 border border-yellow-500/30 rounded-xl p-5">

            <p className="text-yellow-400 text-sm">

              📋 Task Completion

            </p>

            <p className="text-3xl font-bold mt-2">

              {analytics.taskCompletionRate}%

            </p>

            <p className="text-slate-400 text-sm mt-2">

              {analytics.completedTasks}/
              {tasks.length} completed

            </p>

          </div>

        </div>


        {/* LEADS + REVENUE */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">


          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <div className="mb-6">

              <h2 className="text-xl font-bold">

                🎯 Lead Pipeline

              </h2>

              <p className="text-slate-400 text-sm mt-1">

                Your leads at each stage

              </p>

            </div>


            <div className="h-[300px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={leadChartData}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                  />

                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                  />

                  <YAxis
                    stroke="#94a3b8"
                    allowDecimals={false}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    fill="#3b82f6"
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>


          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <div className="mb-6">

              <h2 className="text-xl font-bold">

                💰 Revenue Breakdown

              </h2>

              <p className="text-slate-400 text-sm mt-1">

                Paid vs pending revenue

              </p>

            </div>


            <div className="h-[300px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={revenueChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >

                    {revenueChartData.map(
                      (_, index) => (

                        <Cell
                          key={`cell-${index}`}
                          fill={
                            revenueColors[
                              index
                            ]
                          }
                        />

                      )
                    )}

                  </Pie>

                  <Tooltip />

                  <Legend />

                </PieChart>

              </ResponsiveContainer>

            </div>

          </div>

        </div>


        {/* REVENUE DETAILS */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">


          <div className="bg-slate-900 border border-green-500/30 rounded-xl p-5">

            <p className="text-green-400">

              ✅ Paid Revenue

            </p>

            <p className="text-2xl font-bold mt-3">

              {formatMoney(
                analytics.paidRevenue
              )}

            </p>

          </div>


          <div className="bg-slate-900 border border-yellow-500/30 rounded-xl p-5">

            <p className="text-yellow-400">

              ⏳ Pending Revenue

            </p>

            <p className="text-2xl font-bold mt-3">

              {formatMoney(
                analytics.pendingRevenue
              )}

            </p>

          </div>


          <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">

            <p className="text-blue-400">

              📊 Average Sale

            </p>

            <p className="text-2xl font-bold mt-3">

              {formatMoney(
                analytics.averageSale
              )}

            </p>

          </div>

        </div>


        {/* TASKS + FOLLOW UPS */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">


          {/* TASK CHART */}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-xl font-bold mb-6">

              📋 Task Performance

            </h2>


            <div className="h-[280px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={taskChartData}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                  />

                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                  />

                  <YAxis
                    allowDecimals={false}
                    stroke="#94a3b8"
                  />

                  <Tooltip />

                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    fill="#8b5cf6"
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>


          {/* FOLLOW UP CHART */}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-xl font-bold mb-6">

              📞 Follow-up Performance

            </h2>


            <div className="h-[280px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={followUpChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >

                    {followUpChartData.map(
                      (_, index) => (

                        <Cell
                          key={`follow-${index}`}
                          fill={
                            taskColors[
                              index
                            ]
                          }
                        />

                      )
                    )}

                  </Pie>

                  <Tooltip />

                  <Legend />

                </PieChart>

              </ResponsiveContainer>

            </div>

          </div>

        </div>


        {/* BIZAI RECOMMENDATIONS */}

        <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/30 rounded-2xl p-6 md:p-8">

          <div className="flex items-center gap-3 mb-6">

            <div className="text-3xl">

              🤖

            </div>

            <div>

              <h2 className="text-xl font-bold">

                BizAI Recommendations

              </h2>

              <p className="text-slate-400 text-sm">

                Smart suggestions based on your real business data

              </p>

            </div>

          </div>


          <div className="space-y-4">


            {analytics.overdueTasks > 0 && (

              <div className="bg-slate-900/70 border border-red-500/30 rounded-xl p-4">

                🚨 You have{" "}

                <span className="font-bold">

                  {analytics.overdueTasks}

                </span>{" "}

                overdue task(s). Complete them as soon as possible.

              </div>

            )}


            {analytics.pendingFollowUps > 0 && (

              <div className="bg-slate-900/70 border border-blue-500/30 rounded-xl p-4">

                📞 You have{" "}

                <span className="font-bold">

                  {analytics.pendingFollowUps}

                </span>{" "}

                pending follow-up(s). Regular communication can improve conversions.

              </div>

            )}


            {analytics.interestedLeads +
              analytics.negotiationLeads >
              0 && (

              <div className="bg-slate-900/70 border border-orange-500/30 rounded-xl p-4">

                🔥 You have{" "}

                <span className="font-bold">

                  {analytics.interestedLeads +
                    analytics.negotiationLeads}

                </span>{" "}

                high-potential lead(s). Focus on them to increase conversions.

              </div>

            )}


            {analytics.pendingRevenue > 0 && (

              <div className="bg-slate-900/70 border border-yellow-500/30 rounded-xl p-4">

                💰 You have pending revenue of{" "}

                <span className="font-bold">

                  {formatMoney(
                    analytics.pendingRevenue
                  )}

                </span>

                . Follow up with customers for payment collection.

              </div>

            )}


            {analytics.overdueTasks === 0 &&
              analytics.pendingFollowUps === 0 &&
              analytics.pendingRevenue === 0 && (

              <div className="bg-slate-900/70 border border-green-500/30 rounded-xl p-4">

                🎉 Great job! Your business operations look organized.
                Keep maintaining regular follow-ups and focus on growing
                your sales.

              </div>

            )}

          </div>

        </div>


        {/* FOOTER */}

        <div className="text-center text-slate-500 text-sm mt-10 pb-5">

          🤖 BizAI Smart Analytics • Powered by your real business data

        </div>

      </div>

    </main>

  );

}


// ======================================
// PROTECTED PAGE
// ======================================

export default function AnalyticsPage() {

  return (

    <ProtectedRoute>

      <AnalyticsContent />

    </ProtectedRoute>

  );

}