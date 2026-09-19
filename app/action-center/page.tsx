"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Lead = {
  id: string;
  name: string;
  status: string;
  follow_up_priority: string | null;
  follow_up_notes: string | null;
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
  due_date: string | null;
  completed: boolean;
};

type Sale = {
  id: string;
  amount: number | null;
  payment_status: string;
};

type Action = {
  id: number;
  title: string;
  description: string;
  type: "urgent" | "high" | "medium" | "success";
  icon: string;
};

export default function ActionCenterPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // LOAD ALL BUSINESS DATA
  // =========================

  async function loadData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "/login";
      return;
    }

    const userId = session.user.id;

    const [
      leadsResult,
      tasksResult,
      followUpsResult,
      salesResult,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, name, status, follow_up_priority, follow_up_notes, created_at"
        )
        .eq("user_id", userId),

      supabase
        .from("tasks")
        .select(
          "id, title, status, priority, due_date"
        )
        .eq("user_id", userId),

      supabase
        .from("follow_ups")
        .select(
          "id, lead_id, title, due_date, completed"
        )
        .eq("user_id", userId),

      supabase
        .from("sales")
        .select(
          "id, amount, payment_status"
        )
        .eq("user_id", userId),
    ]);

    if (leadsResult.error) {
      console.error(
        "Leads error:",
        leadsResult.error.message
      );
    }

    if (tasksResult.error) {
      console.error(
        "Tasks error:",
        tasksResult.error.message
      );
    }

    if (followUpsResult.error) {
      console.error(
        "Follow-ups error:",
        followUpsResult.error.message
      );
    }

    if (salesResult.error) {
      console.error(
        "Sales error:",
        salesResult.error.message
      );
    }

    setLeads(leadsResult.data || []);
    setTasks(tasksResult.data || []);
    setFollowUps(followUpsResult.data || []);
    setSales(salesResult.data || []);

    setLoading(false);
    setRefreshing(false);
  }

  // =========================
  // DATE HELPERS
  // =========================

  function getToday() {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return today;
  }

  function isOverdue(date: string | null) {
    if (!date) return false;

    const today = getToday();

    const itemDate = new Date(date);

    itemDate.setHours(0, 0, 0, 0);

    return itemDate < today;
  }

  function isDueToday(date: string | null) {
    if (!date) return false;

    const today = getToday();

    const itemDate = new Date(date);

    itemDate.setHours(0, 0, 0, 0);

    return (
      itemDate.getTime() === today.getTime()
    );
  }

  // =========================
  // GET LEAD NAME
  // =========================

  function getLeadName(leadId: string | null) {
    if (!leadId) return "Unknown Lead";

    return (
      leads.find(
        (lead) => lead.id === leadId
      )?.name || "Unknown Lead"
    );
  }

  // =========================
  // GENERATE SMART ACTIONS
  // =========================

  const actions = useMemo(() => {
    const generatedActions: Action[] = [];

    let actionId = 1;

    // =====================
    // OVERDUE FOLLOW-UPS
    // =====================

    const overdueFollowUps =
      followUps.filter(
        (followUp) =>
          !followUp.completed &&
          isOverdue(followUp.due_date)
      );

    overdueFollowUps.forEach((followUp) => {
      generatedActions.push({
        id: actionId++,

        title: `Follow up with ${getLeadName(
          followUp.lead_id
        )}`,

        description: `🚨 Overdue follow-up: "${followUp.title}"${
          followUp.due_date
            ? ` was due on ${followUp.due_date}`
            : ""
        }. Contact this lead immediately.`,

        type: "urgent",

        icon: "🚨",
      });
    });

    // =====================
    // FOLLOW-UPS DUE TODAY
    // =====================

    const todayFollowUps =
      followUps.filter(
        (followUp) =>
          !followUp.completed &&
          isDueToday(followUp.due_date)
      );

    todayFollowUps.forEach((followUp) => {
      generatedActions.push({
        id: actionId++,

        title: `Follow up with ${getLeadName(
          followUp.lead_id
        )}`,

        description: `📞 Today's follow-up: "${followUp.title}". Contact the lead today.`,

        type: "high",

        icon: "📞",
      });
    });

    // =====================
    // INTERESTED LEADS
    // =====================

    const interestedLeads =
      leads.filter(
        (lead) =>
          lead.status === "Interested"
      );

    interestedLeads.forEach((lead) => {
      generatedActions.push({
        id: actionId++,

        title: `Focus on ${lead.name}`,

        description:
          "🔥 This lead is interested and has strong conversion potential. Contact them and move toward conversion.",

        type: "high",

        icon: "🔥",
      });
    });

    // =====================
    // NEGOTIATION LEADS
    // =====================

    const negotiationLeads =
      leads.filter(
        (lead) =>
          lead.status === "Negotiation"
      );

    negotiationLeads.forEach((lead) => {
      generatedActions.push({
        id: actionId++,

        title: `Close deal with ${lead.name}`,

        description:
          "🤝 This lead is in negotiation. Discuss final pricing, objections and decision timeline.",

        type: "high",

        icon: "🤝",
      });
    });

    // =====================
    // HIGH PRIORITY NEW LEADS
    // =====================

    const highPriorityLeads =
      leads.filter(
        (lead) =>
          lead.status === "New" &&
          lead.follow_up_priority === "High"
      );

    highPriorityLeads.forEach((lead) => {
      generatedActions.push({
        id: actionId++,

        title: `Contact new lead ${lead.name}`,

        description:
          "🎯 This is a high-priority new lead. Make first contact as soon as possible.",

        type: "high",

        icon: "🎯",
      });
    });

    // =====================
    // OVERDUE TASKS
    // =====================

    const overdueTasks =
      tasks.filter(
        (task) =>
          task.status !== "Completed" &&
          isOverdue(task.due_date)
      );

    overdueTasks.forEach((task) => {
      generatedActions.push({
        id: actionId++,

        title: `Complete overdue task`,

        description: `🚨 "${task.title}"${
          task.due_date
            ? ` was due on ${task.due_date}`
            : ""
        }. Complete this task as soon as possible.`,

        type: "urgent",

        icon: "📋",
      });
    });

    // =====================
    // TASKS DUE TODAY
    // =====================

    const todayTasks =
      tasks.filter(
        (task) =>
          task.status !== "Completed" &&
          isDueToday(task.due_date)
      );

    todayTasks.forEach((task) => {
      generatedActions.push({
        id: actionId++,

        title: `Complete "${task.title}"`,

        description:
          "📅 This task is due today. Try to complete it before the end of the day.",

        type: "high",

        icon: "⏳",
      });
    });

    // =====================
    // HIGH PRIORITY TASKS
    // =====================

    const highPriorityTasks =
      tasks.filter(
        (task) =>
          task.status !== "Completed" &&
          task.priority === "High" &&
          !isOverdue(task.due_date)
      );

    highPriorityTasks.forEach((task) => {
      generatedActions.push({
        id: actionId++,

        title: `High priority task: ${task.title}`,

        description:
          "🔴 This task has high priority and should be completed soon.",

        type: "high",

        icon: "🔴",
      });
    });

    // =====================
    // PENDING PAYMENTS
    // =====================

    const pendingSales =
      sales.filter(
        (sale) =>
          sale.payment_status === "Pending"
      );

    const pendingAmount =
      pendingSales.reduce(
        (total, sale) =>
          total +
          Number(sale.amount || 0),
        0
      );

    if (pendingSales.length > 0) {
      generatedActions.push({
        id: actionId++,

        title: "Collect pending payments",

        description: `💰 You have ${pendingSales.length} pending payment(s) worth ₹${pendingAmount.toLocaleString(
          "en-IN"
        )}. Follow up with customers.`,

        type: "medium",

        icon: "💰",
      });
    }

    // =====================
    // NO URGENT ACTIONS
    // =====================

    if (generatedActions.length === 0) {
      generatedActions.push({
        id: actionId++,

        title: "Your business is under control!",

        description:
          "🎉 Great job! There are no urgent tasks, follow-ups or payments needing attention right now.",

        type: "success",

        icon: "🎉",
      });
    }

    // =====================
    // SORT BY PRIORITY
    // =====================

    const priorityOrder = {
      urgent: 1,
      high: 2,
      medium: 3,
      success: 4,
    };

    return generatedActions.sort(
      (a, b) =>
        priorityOrder[a.type] -
        priorityOrder[b.type]
    );
  }, [
    leads,
    tasks,
    followUps,
    sales,
  ]);

  // =========================
  // SUMMARY COUNTS
  // =========================

  const overdueFollowUps =
    followUps.filter(
      (followUp) =>
        !followUp.completed &&
        isOverdue(followUp.due_date)
    ).length;

  const overdueTasks =
    tasks.filter(
      (task) =>
        task.status !== "Completed" &&
        isOverdue(task.due_date)
    ).length;

  const pendingPayments =
    sales.filter(
      (sale) =>
        sale.payment_status === "Pending"
    ).length;

  const hotLeads =
    leads.filter(
      (lead) =>
        lead.status === "Interested" ||
        lead.status === "Negotiation"
    ).length;

  // =========================
  // ACTION STYLE
  // =========================

  function getActionStyle(type: string) {
    switch (type) {
      case "urgent":
        return {
          border: "border-red-500/40",
          bg: "bg-red-500/10",
          badge: "bg-red-500/20 text-red-400",
          text: "URGENT",
        };

      case "high":
        return {
          border: "border-orange-500/40",
          bg: "bg-orange-500/10",
          badge:
            "bg-orange-500/20 text-orange-400",
          text: "HIGH PRIORITY",
        };

      case "medium":
        return {
          border: "border-yellow-500/40",
          bg: "bg-yellow-500/10",
          badge:
            "bg-yellow-500/20 text-yellow-400",
          text: "ATTENTION",
        };

      default:
        return {
          border: "border-green-500/40",
          bg: "bg-green-500/10",
          badge:
            "bg-green-500/20 text-green-400",
          text: "ALL GOOD",
        };
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-4">
            🤖
          </div>

          <h2 className="text-xl font-semibold">
            BizAI is analyzing your business...
          </h2>

          <p className="text-slate-400 mt-2">
            Finding your most important actions.
          </p>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>

            <h1 className="text-3xl md:text-4xl font-bold">
              ⚡ AI Business Action Center
            </h1>

            <p className="text-slate-400 mt-2">
              Your smartest priorities for today,
              powered by BizAI.
            </p>

          </div>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-3 rounded-xl font-semibold"
          >
            {refreshing
              ? "🤖 Analyzing..."
              : "🔄 Refresh Analysis"}
          </button>

        </div>

        {/* AI DAILY MESSAGE */}

        <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/10 to-slate-900 border border-blue-500/30 rounded-2xl p-6 mb-8">

          <p className="text-blue-400 text-sm font-semibold mb-2">
            🤖 BIZAI DAILY INSIGHT
          </p>

          <h2 className="text-2xl font-bold">

            You have {actions.length} action
            {actions.length !== 1 ? "s" : ""}{" "}
            to focus on today.

          </h2>

          <p className="text-slate-300 mt-3">

            {actions[0]?.type === "success"
              ? "Everything looks good! Keep growing your business and maintain regular communication with your customers."
              : "Start with urgent items first, then focus on your best sales opportunities."}

          </p>

        </div>

        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

          <div className="bg-slate-900 border border-red-500/30 rounded-xl p-5">

            <p className="text-red-400 text-sm">
              🚨 Overdue Follow-ups
            </p>

            <p className="text-3xl font-bold mt-2">
              {overdueFollowUps}
            </p>

          </div>

          <div className="bg-slate-900 border border-orange-500/30 rounded-xl p-5">

            <p className="text-orange-400 text-sm">
              📋 Overdue Tasks
            </p>

            <p className="text-3xl font-bold mt-2">
              {overdueTasks}
            </p>

          </div>

          <div className="bg-slate-900 border border-yellow-500/30 rounded-xl p-5">

            <p className="text-yellow-400 text-sm">
              💰 Pending Payments
            </p>

            <p className="text-3xl font-bold mt-2">
              {pendingPayments}
            </p>

          </div>

          <div className="bg-slate-900 border border-green-500/30 rounded-xl p-5">

            <p className="text-green-400 text-sm">
              🔥 High Potential Leads
            </p>

            <p className="text-3xl font-bold mt-2">
              {hotLeads}
            </p>

          </div>

        </div>

        {/* TOP 3 PRIORITIES */}

        <div className="mb-10">

          <h2 className="text-2xl font-bold mb-5">
            🔥 Top 3 Priorities Today
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {actions.slice(0, 3).map(
              (action, index) => {
                const style =
                  getActionStyle(action.type);

                return (
                  <div
                    key={action.id}
                    className={`border ${style.border} ${style.bg} rounded-2xl p-6`}
                  >

                    <p className="text-slate-400 text-sm mb-3">
                      Priority #{index + 1}
                    </p>

                    <div className="text-4xl mb-4">
                      {action.icon}
                    </div>

                    <h3 className="text-xl font-bold">
                      {action.title}
                    </h3>

                    <p className="text-slate-300 text-sm mt-3">
                      {action.description}
                    </p>

                  </div>
                );
              }
            )}

          </div>

        </div>

        {/* ALL ACTIONS */}

        <div>

          <div className="flex items-center justify-between mb-5">

            <div>

              <h2 className="text-2xl font-bold">
                📋 All Recommended Actions
              </h2>

              <p className="text-slate-400 text-sm mt-1">
                Automatically generated from your real business data.
              </p>

            </div>

            <span className="text-slate-400 text-sm">
              {actions.length} total
            </span>

          </div>

          <div className="space-y-4">

            {actions.map((action) => {
              const style =
                getActionStyle(action.type);

              return (
                <div
                  key={action.id}
                  className={`bg-slate-900 border ${style.border} rounded-xl p-5 flex gap-4`}
                >

                  <div className="text-3xl">
                    {action.icon}
                  </div>

                  <div className="flex-1">

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                      <h3 className="font-bold text-lg">
                        {action.title}
                      </h3>

                      <span
                        className={`${style.badge} px-3 py-1 rounded-full text-xs font-semibold w-fit`}
                      >
                        {style.text}
                      </span>

                    </div>

                    <p className="text-slate-400 text-sm mt-2">
                      {action.description}
                    </p>

                  </div>

                </div>
              );
            })}

          </div>

        </div>

        {/* HOW IT WORKS */}

        <div className="mt-10 bg-slate-900 border border-slate-800 rounded-2xl p-6">

          <h2 className="text-xl font-bold mb-5">
            🤖 How BizAI Decides Your Priorities
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

            <div>

              <div className="text-2xl mb-2">
                🚨
              </div>

              <h3 className="font-semibold">
                Urgent
              </h3>

              <p className="text-slate-400 text-sm mt-1">
                Overdue follow-ups and overdue tasks.
              </p>

            </div>

            <div>

              <div className="text-2xl mb-2">
                🔥
              </div>

              <h3 className="font-semibold">
                Sales Opportunities
              </h3>

              <p className="text-slate-400 text-sm mt-1">
                Interested and negotiation-stage leads.
              </p>

            </div>

            <div>

              <div className="text-2xl mb-2">
                📞
              </div>

              <h3 className="font-semibold">
                Follow-ups
              </h3>

              <p className="text-slate-400 text-sm mt-1">
                Follow-ups scheduled for today.
              </p>

            </div>

            <div>

              <div className="text-2xl mb-2">
                💰
              </div>

              <h3 className="font-semibold">
                Payments
              </h3>

              <p className="text-slate-400 text-sm mt-1">
                Pending payments that need collection.
              </p>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}