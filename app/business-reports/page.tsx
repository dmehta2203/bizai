"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";

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
  due_date: string | null;
};

type FollowUp = {
  id: string;
  completed: boolean;
  due_date: string | null;
};

type Sale = {
  id: string;
  amount: number | null;
  payment_status: string;
};

export default function BusinessReportsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // =========================
  // LOAD DATA
  // =========================

  useEffect(() => {
    loadReportData();
  }, []);

  async function loadReportData(isRefresh = false) {
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
      customersResult,
      tasksResult,
      followUpsResult,
      salesResult,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select("id, name, status")
        .eq("user_id", userId),

      supabase
        .from("customers")
        .select("id")
        .eq("user_id", userId),

      supabase
        .from("tasks")
        .select("id, status, due_date")
        .eq("user_id", userId),

      supabase
        .from("follow_ups")
        .select("id, completed, due_date")
        .eq("user_id", userId),

      supabase
        .from("sales")
        .select("id, amount, payment_status")
        .eq("user_id", userId),
    ]);

    if (leadsResult.error) {
      console.error(
        "Leads error:",
        leadsResult.error.message
      );
    }

    if (customersResult.error) {
      console.error(
        "Customers error:",
        customersResult.error.message
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
    setCustomers(customersResult.data || []);
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

  // =========================
  // FORMAT MONEY
  // =========================

  function formatMoney(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // =========================
  // CALCULATE REPORT DATA
  // =========================

  const report = useMemo(() => {
    // LEADS

    const newLeads = leads.filter(
      (lead) => lead.status === "New"
    ).length;

    const contactedLeads = leads.filter(
      (lead) => lead.status === "Contacted"
    ).length;

    const interestedLeads = leads.filter(
      (lead) => lead.status === "Interested"
    ).length;

    const negotiationLeads = leads.filter(
      (lead) => lead.status === "Negotiation"
    ).length;

    const convertedLeads = leads.filter(
      (lead) => lead.status === "Converted"
    ).length;

    const conversionRate =
      leads.length > 0
        ? Math.round(
            (convertedLeads / leads.length) * 100
          )
        : 0;

    // TASKS

    const completedTasks = tasks.filter(
      (task) => task.status === "Completed"
    ).length;

    const pendingTasks = tasks.filter(
      (task) => task.status === "Pending"
    ).length;

    const overdueTasks = tasks.filter(
      (task) =>
        task.status !== "Completed" &&
        isOverdue(task.due_date)
    ).length;

    const taskCompletionRate =
      tasks.length > 0
        ? Math.round(
            (completedTasks / tasks.length) * 100
          )
        : 0;

    // FOLLOW UPS

    const completedFollowUps = followUps.filter(
      (followUp) => followUp.completed
    ).length;

    const pendingFollowUps = followUps.filter(
      (followUp) => !followUp.completed
    ).length;

    const overdueFollowUps = followUps.filter(
      (followUp) =>
        !followUp.completed &&
        isOverdue(followUp.due_date)
    ).length;

    // SALES

    const totalRevenue = sales.reduce(
      (total, sale) =>
        total + Number(sale.amount || 0),
      0
    );

    const paidRevenue = sales
      .filter(
        (sale) =>
          sale.payment_status === "Paid"
      )
      .reduce(
        (total, sale) =>
          total + Number(sale.amount || 0),
        0
      );

    const pendingRevenue = sales
      .filter(
        (sale) =>
          sale.payment_status === "Pending"
      )
      .reduce(
        (total, sale) =>
          total + Number(sale.amount || 0),
        0
      );

    const averageSale =
      sales.length > 0
        ? totalRevenue / sales.length
        : 0;

    // =========================
    // REVENUE FORECAST
    // =========================

    const forecastRevenue =
      averageSale * (sales.length + 5);

    // =========================
    // BUSINESS HEALTH SCORE
    // =========================

    let healthScore = 0;

    // Lead Conversion - 30 Points

    healthScore += Math.min(
      conversionRate * 0.3,
      30
    );

    // Task Completion - 25 Points

    healthScore += Math.min(
      taskCompletionRate * 0.25,
      25
    );

    // Follow-up Management - 20 Points

    if (followUps.length === 0) {
      healthScore += 20;
    } else {
      const followUpScore =
        ((followUps.length -
          overdueFollowUps) /
          followUps.length) *
        20;

      healthScore += Math.max(
        0,
        followUpScore
      );
    }

    // Payment Health - 25 Points

    if (totalRevenue === 0) {
      healthScore += 25;
    } else {
      const paymentScore =
        (paidRevenue / totalRevenue) * 25;

      healthScore += paymentScore;
    }

    healthScore = Math.round(
      Math.min(100, healthScore)
    );

    // =========================
    // HOT LEADS
    // =========================

    const hotLeads =
      interestedLeads +
      negotiationLeads;

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

      forecastRevenue,

      healthScore,

      hotLeads,
    };
  }, [
    leads,
    tasks,
    followUps,
    sales,
  ]);

  // =========================
  // HEALTH STATUS
  // =========================

  function getHealthStatus() {
    const score = report.healthScore;

    if (score >= 80) {
      return {
        label: "Excellent",
        emoji: "🟢",
      };
    }

    if (score >= 60) {
      return {
        label: "Good",
        emoji: "🔵",
      };
    }

    if (score >= 40) {
      return {
        label: "Needs Attention",
        emoji: "🟡",
      };
    }

    return {
      label: "Needs Improvement",
      emoji: "🔴",
    };
  }

  const healthStatus =
    getHealthStatus();

  // =========================
  // REPORT DATE
  // =========================

  const reportDate =
    new Date().toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

  // =========================
  // DOWNLOAD PDF
  // =========================

  function downloadPDF() {
    const pdf = new jsPDF();

    let y = 20;

    function checkPage() {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    }

    function addText(
      text: string,
      size = 12,
      bold = false
    ) {
      checkPage();

      pdf.setFontSize(size);

      pdf.setFont(
        "helvetica",
        bold ? "bold" : "normal"
      );

      const lines =
        pdf.splitTextToSize(
          text,
          170
        );

      pdf.text(
        lines,
        20,
        y
      );

      y +=
        lines.length *
          (size * 0.45 + 3) +
        5;
    }

    function addSpace(space = 5) {
      y += space;

      checkPage();
    }

    // =========================
    // TITLE
    // =========================

    addText(
      "BizAI Smart Business Report",
      20,
      true
    );

    addText(
      `Report Generated: ${reportDate}`,
      10
    );

    addSpace(5);

    // =========================
    // BUSINESS HEALTH
    // =========================

    addText(
      "BUSINESS HEALTH",
      16,
      true
    );

    addText(
      `Health Score: ${report.healthScore}/100`
    );

    addText(
      `Status: ${healthStatus.label}`
    );

    addSpace();

    // =========================
    // BUSINESS SUMMARY
    // =========================

    addText(
      "BUSINESS SUMMARY",
      16,
      true
    );

    addText(
      `Total Leads: ${leads.length}`
    );

    addText(
      `Total Customers: ${customers.length}`
    );

    addText(
      `Conversion Rate: ${report.conversionRate}%`
    );

    addText(
      `Total Revenue: ${formatMoney(
        report.totalRevenue
      )}`
    );

    addSpace();

    // =========================
    // REVENUE REPORT
    // =========================

    addText(
      "REVENUE REPORT",
      16,
      true
    );

    addText(
      `Total Revenue: ${formatMoney(
        report.totalRevenue
      )}`
    );

    addText(
      `Paid Revenue: ${formatMoney(
        report.paidRevenue
      )}`
    );

    addText(
      `Pending Revenue: ${formatMoney(
        report.pendingRevenue
      )}`
    );

    addText(
      `Average Sale: ${formatMoney(
        report.averageSale
      )}`
    );

    addSpace();

    // =========================
    // AI REVENUE FORECAST
    // =========================

    addText(
      "AI REVENUE FORECAST",
      16,
      true
    );

    addText(
      `Current Sales: ${sales.length}`
    );

    addText(
      `Average Sale Value: ${formatMoney(
        report.averageSale
      )}`
    );

    addText(
      `Forecast Revenue: ${formatMoney(
        report.forecastRevenue
      )}`
    );

    addSpace();

    // =========================
    // AI LEAD INSIGHTS
    // =========================

    addText(
      "AI LEAD INSIGHTS",
      16,
      true
    );

    addText(
      `New Leads: ${report.newLeads}`
    );

    addText(
      `Contacted Leads: ${report.contactedLeads}`
    );

    addText(
      `Interested Leads: ${report.interestedLeads}`
    );

    addText(
      `Negotiation Leads: ${report.negotiationLeads}`
    );

    addText(
      `Converted Leads: ${report.convertedLeads}`
    );

    addText(
      `High Potential Leads: ${report.hotLeads}`
    );

    addSpace();

    // =========================
    // TASK PERFORMANCE
    // =========================

    addText(
      "TASK PERFORMANCE",
      16,
      true
    );

    addText(
      `Completed Tasks: ${report.completedTasks}`
    );

    addText(
      `Pending Tasks: ${report.pendingTasks}`
    );

    addText(
      `Overdue Tasks: ${report.overdueTasks}`
    );

    addText(
      `Task Completion Rate: ${report.taskCompletionRate}%`
    );

    addSpace();

    // =========================
    // FOLLOW-UP PERFORMANCE
    // =========================

    addText(
      "FOLLOW-UP PERFORMANCE",
      16,
      true
    );

    addText(
      `Completed Follow-ups: ${report.completedFollowUps}`
    );

    addText(
      `Pending Follow-ups: ${report.pendingFollowUps}`
    );

    addText(
      `Overdue Follow-ups: ${report.overdueFollowUps}`
    );

    addSpace();

    // =========================
    // AI RECOMMENDATIONS
    // =========================

    addText(
      "BIZAI RECOMMENDATIONS",
      16,
      true
    );

    if (report.overdueTasks > 0) {
      addText(
        `Complete ${report.overdueTasks} overdue task(s) to improve business productivity.`
      );
    }

    if (report.pendingFollowUps > 0) {
      addText(
        `Follow up on ${report.pendingFollowUps} pending customer or lead communication(s).`
      );
    }

    if (report.hotLeads > 0) {
      addText(
        `Focus on ${report.hotLeads} high-potential lead(s) to improve your conversion rate.`
      );
    }

    if (report.pendingRevenue > 0) {
      addText(
        `Collect pending payments of ${formatMoney(
          report.pendingRevenue
        )} to improve business cash flow.`
      );
    }

    if (
      report.overdueTasks === 0 &&
      report.pendingFollowUps === 0 &&
      report.pendingRevenue === 0
    ) {
      addText(
        "Your business operations look well organized. Focus on growth and customer relationships."
      );
    }

    addSpace(10);

    // =========================
    // FOOTER
    // =========================

    addText(
      "Generated by BizAI Smart Business Assistant",
      10
    );

    // =========================
    // SAVE PDF
    // =========================

    const fileDate =
      new Date()
        .toISOString()
        .slice(0, 10);

    pdf.save(
      `BizAI-Business-Report-${fileDate}.pdf`
    );
  }

  // =========================
  // LOADING SCREEN
  // =========================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-4">
            📄
          </div>

          <h2 className="text-xl font-semibold">
            Generating Business Report...
          </h2>

          <p className="text-slate-400 mt-2">
            Analyzing your business data.
          </p>

        </div>

      </main>
    );
  }

  // =========================
  // PAGE UI
  // =========================

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-6xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>

            <h1 className="text-3xl md:text-4xl font-bold">
              📄 Business Report
            </h1>

            <p className="text-slate-400 mt-2">
              Complete AI-powered business
              performance report.
            </p>

            <p className="text-slate-500 text-sm mt-2">
              Report generated on{" "}
              {reportDate}
            </p>

          </div>

          <div className="flex gap-3">

            <button
              onClick={() =>
                loadReportData(true)
              }
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-3 rounded-xl font-semibold"
            >
              {refreshing
                ? "🔄 Refreshing..."
                : "🔄 Refresh"}
            </button>

            <button
              onClick={downloadPDF}
              className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-xl font-semibold"
            >
              📥 Download PDF
            </button>

          </div>

        </div>

        {/* BUSINESS HEALTH */}

        <div className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-slate-900 border border-purple-500/30 rounded-2xl p-6 md:p-8 mb-8">

          <p className="text-purple-400 text-sm font-semibold">
            🤖 BIZAI BUSINESS HEALTH
          </p>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mt-4">

            <div>

              <h2 className="text-5xl font-bold">
                {report.healthScore}

                <span className="text-2xl text-slate-400">
                  /100
                </span>
              </h2>

              <p className="text-xl mt-3">
                {healthStatus.emoji}{" "}
                {healthStatus.label}
              </p>

            </div>

            <div className="bg-slate-950/60 border border-slate-700 rounded-xl p-5">

              <p className="text-slate-400 text-sm">
                AI Summary
              </p>

              <p className="font-semibold mt-2">
                {report.hotLeads > 0
                  ? `🔥 ${report.hotLeads} high-potential lead(s) need your attention.`
                  : "📈 Focus on building and nurturing more leads."}
              </p>

            </div>

          </div>

        </div>

        {/* BUSINESS SUMMARY */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

          <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">

            <p className="text-blue-400">
              🎯 Total Leads
            </p>

            <p className="text-3xl font-bold mt-3">
              {leads.length}
            </p>

            <p className="text-slate-400 text-sm mt-2">
              {report.conversionRate}% conversion
            </p>

          </div>

          <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5">

            <p className="text-purple-400">
              👥 Customers
            </p>

            <p className="text-3xl font-bold mt-3">
              {customers.length}
            </p>

          </div>

          <div className="bg-slate-900 border border-green-500/30 rounded-xl p-5">

            <p className="text-green-400">
              💰 Revenue
            </p>

            <p className="text-2xl font-bold mt-3">
              {formatMoney(
                report.totalRevenue
              )}
            </p>

          </div>

          <div className="bg-slate-900 border border-yellow-500/30 rounded-xl p-5">

            <p className="text-yellow-400">
              📋 Task Completion
            </p>

            <p className="text-3xl font-bold mt-3">
              {report.taskCompletionRate}%
            </p>

          </div>

        </div>

        {/* REVENUE REPORT */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

          <h2 className="text-xl font-bold">
            💰 Revenue Report
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">

            <div className="bg-slate-950 rounded-xl p-5">

              <p className="text-green-400">
                Total Revenue
              </p>

              <p className="text-2xl font-bold mt-3">
                {formatMoney(
                  report.totalRevenue
                )}
              </p>

            </div>

            <div className="bg-slate-950 rounded-xl p-5">

              <p className="text-blue-400">
                Paid Revenue
              </p>

              <p className="text-2xl font-bold mt-3">
                {formatMoney(
                  report.paidRevenue
                )}
              </p>

            </div>

            <div className="bg-slate-950 rounded-xl p-5">

              <p className="text-yellow-400">
                Pending Revenue
              </p>

              <p className="text-2xl font-bold mt-3">
                {formatMoney(
                  report.pendingRevenue
                )}
              </p>

            </div>

          </div>

        </div>

        {/* REVENUE FORECAST */}

        <div className="bg-gradient-to-r from-green-600/10 to-blue-600/10 border border-green-500/30 rounded-2xl p-6 mb-8">

          <h2 className="text-xl font-bold">
            📈 AI Revenue Forecast
          </h2>

          <p className="text-slate-400 text-sm mt-2">
            Estimated future revenue based on
            your current sales performance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">

            <div>

              <p className="text-slate-400">
                Average Sale
              </p>

              <p className="text-2xl font-bold mt-2">
                {formatMoney(
                  report.averageSale
                )}
              </p>

            </div>

            <div>

              <p className="text-slate-400">
                Current Sales
              </p>

              <p className="text-2xl font-bold mt-2">
                {sales.length}
              </p>

            </div>

            <div>

              <p className="text-green-400">
                Forecast Revenue
              </p>

              <p className="text-2xl font-bold mt-2">
                {formatMoney(
                  report.forecastRevenue
                )}
              </p>

            </div>

          </div>

        </div>

        {/* LEAD INSIGHTS */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

          <h2 className="text-xl font-bold">
            🎯 AI Lead Insights
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">

            <div className="bg-slate-950 rounded-xl p-4 text-center">

              <p className="text-blue-400">
                New
              </p>

              <p className="text-2xl font-bold mt-2">
                {report.newLeads}
              </p>

            </div>

            <div className="bg-slate-950 rounded-xl p-4 text-center">

              <p className="text-yellow-400">
                Contacted
              </p>

              <p className="text-2xl font-bold mt-2">
                {report.contactedLeads}
              </p>

            </div>

            <div className="bg-slate-950 rounded-xl p-4 text-center">

              <p className="text-green-400">
                Interested
              </p>

              <p className="text-2xl font-bold mt-2">
                {report.interestedLeads}
              </p>

            </div>

            <div className="bg-slate-950 rounded-xl p-4 text-center">

              <p className="text-orange-400">
                Negotiation
              </p>

              <p className="text-2xl font-bold mt-2">
                {report.negotiationLeads}
              </p>

            </div>

            <div className="bg-slate-950 rounded-xl p-4 text-center">

              <p className="text-purple-400">
                Converted
              </p>

              <p className="text-2xl font-bold mt-2">
                {report.convertedLeads}
              </p>

            </div>

          </div>

        </div>

        {/* TASK AND FOLLOW-UP REPORT */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-xl font-bold">
              📋 Task Performance
            </h2>

            <div className="space-y-4 mt-6">

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Completed
                </span>

                <span className="text-green-400 font-bold">
                  {report.completedTasks}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Pending
                </span>

                <span className="text-yellow-400 font-bold">
                  {report.pendingTasks}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Overdue
                </span>

                <span className="text-red-400 font-bold">
                  {report.overdueTasks}
                </span>

              </div>

            </div>

          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-xl font-bold">
              📞 Follow-up Performance
            </h2>

            <div className="space-y-4 mt-6">

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Completed
                </span>

                <span className="text-green-400 font-bold">
                  {report.completedFollowUps}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Pending
                </span>

                <span className="text-yellow-400 font-bold">
                  {report.pendingFollowUps}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Overdue
                </span>

                <span className="text-red-400 font-bold">
                  {report.overdueFollowUps}
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* AI RECOMMENDATIONS */}

        <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/30 rounded-2xl p-6 md:p-8 mb-8">

          <h2 className="text-xl font-bold">
            🤖 BizAI Recommendations
          </h2>

          <div className="space-y-4 mt-6">

            {report.overdueTasks > 0 && (

              <div className="bg-slate-900/70 rounded-xl p-4">

                🚨 Complete{" "}

                <b>
                  {report.overdueTasks}
                </b>{" "}

                overdue task(s) to improve
                business productivity.

              </div>

            )}

            {report.pendingFollowUps > 0 && (

              <div className="bg-slate-900/70 rounded-xl p-4">

                📞 Follow up with{" "}

                <b>
                  {report.pendingFollowUps}
                </b>{" "}

                pending customer or lead communication(s).

              </div>

            )}

            {report.hotLeads > 0 && (

              <div className="bg-slate-900/70 rounded-xl p-4">

                🔥 Focus on{" "}

                <b>
                  {report.hotLeads}
                </b>{" "}

                high-potential lead(s) to improve
                your conversion rate.

              </div>

            )}

            {report.pendingRevenue > 0 && (

              <div className="bg-slate-900/70 rounded-xl p-4">

                💰 Collect pending payments of{" "}

                <b>
                  {formatMoney(
                    report.pendingRevenue
                  )}
                </b>{" "}

                to improve cash flow.

              </div>

            )}

            {report.overdueTasks === 0 &&
              report.pendingFollowUps === 0 &&
              report.pendingRevenue === 0 && (

              <div className="bg-slate-900/70 rounded-xl p-4">

                🎉 Your business operations look
                well organized. Focus on growth
                and customer relationships.

              </div>

            )}

          </div>

        </div>

        {/* FOOTER */}

        <div className="text-center text-slate-500 text-sm pb-6">

          📄 BizAI Smart Business Report

          <br />

          Generated from your real business data

        </div>

      </div>

    </main>
  );
}