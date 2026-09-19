"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Sale = {
  id: string;
  amount: number | null;
  payment_status: string;
  created_at: string;
};

type MonthlyRevenue = {
  month: string;
  revenue: number;
};

export default function ForecastPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales(isRefresh = false) {
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

    const { data, error } = await supabase
      .from("sales")
      .select("id, amount, payment_status, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      setSales(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }

  // =========================
  // MONTHLY REVENUE DATA
  // =========================

  const monthlyRevenue = useMemo(() => {
    const revenueMap: Record<string, number> = {};

    sales.forEach((sale) => {
      if (
        sale.payment_status === "Paid" ||
        sale.payment_status === "Completed"
      ) {
        const date = new Date(sale.created_at);

        const month = date.toLocaleString(
          "en-IN",
          {
            month: "short",
            year: "numeric",
          }
        );

        revenueMap[month] =
          (revenueMap[month] || 0) +
          Number(sale.amount || 0);
      }
    });

    return Object.entries(revenueMap).map(
      ([month, revenue]) => ({
        month,
        revenue,
      })
    );
  }, [sales]);

  // =========================
  // TOTAL REVENUE
  // =========================

  const totalRevenue = useMemo(() => {
    return sales
      .filter(
        (sale) =>
          sale.payment_status === "Paid" ||
          sale.payment_status === "Completed"
      )
      .reduce(
        (total, sale) =>
          total + Number(sale.amount || 0),
        0
      );
  }, [sales]);

  // =========================
  // CURRENT MONTH REVENUE
  // =========================

  const currentMonthRevenue = useMemo(() => {
    const now = new Date();

    return sales
      .filter((sale) => {
        const saleDate = new Date(
          sale.created_at
        );

        const isSameMonth =
          saleDate.getMonth() ===
            now.getMonth() &&
          saleDate.getFullYear() ===
            now.getFullYear();

        const isPaid =
          sale.payment_status === "Paid" ||
          sale.payment_status === "Completed";

        return isSameMonth && isPaid;
      })
      .reduce(
        (total, sale) =>
          total + Number(sale.amount || 0),
        0
      );
  }, [sales]);

  // =========================
  // AVERAGE MONTHLY REVENUE
  // =========================

  const averageRevenue = useMemo(() => {
    if (monthlyRevenue.length === 0) {
      return 0;
    }

    return (
      totalRevenue / monthlyRevenue.length
    );
  }, [
    totalRevenue,
    monthlyRevenue,
  ]);

  // =========================
  // BEST MONTH
  // =========================

  const bestMonth = useMemo(() => {
    if (monthlyRevenue.length === 0) {
      return null;
    }

    return monthlyRevenue.reduce(
      (best, current) =>
        current.revenue > best.revenue
          ? current
          : best
    );
  }, [monthlyRevenue]);

  // =========================
  // REVENUE GROWTH
  // =========================

  const revenueGrowth = useMemo(() => {
    if (monthlyRevenue.length < 2) {
      return 0;
    }

    const current =
      monthlyRevenue[
        monthlyRevenue.length - 1
      ].revenue;

    const previous =
      monthlyRevenue[
        monthlyRevenue.length - 2
      ].revenue;

    if (previous === 0) {
      return 0;
    }

    return (
      ((current - previous) / previous) *
      100
    );
  }, [monthlyRevenue]);

  // =========================
  // AI REVENUE FORECAST
  // =========================

  const forecastRevenue = useMemo(() => {
    if (monthlyRevenue.length === 0) {
      return 0;
    }

    // Basic average forecast

    let forecast = averageRevenue;

    // Add recent trend

    if (monthlyRevenue.length >= 2) {
      const latest =
        monthlyRevenue[
          monthlyRevenue.length - 1
        ].revenue;

      const previous =
        monthlyRevenue[
          monthlyRevenue.length - 2
        ].revenue;

      if (latest > previous) {
        forecast =
          averageRevenue +
          (latest - previous) * 0.5;
      }

      if (latest < previous) {
        forecast =
          averageRevenue -
          (previous - latest) * 0.25;
      }
    }

    return Math.max(
      0,
      Math.round(forecast)
    );
  }, [
    averageRevenue,
    monthlyRevenue,
  ]);

  // =========================
  // NEXT MONTH NAME
  // =========================

  const nextMonth = useMemo(() => {
    const date = new Date();

    date.setMonth(
      date.getMonth() + 1
    );

    return date.toLocaleString(
      "en-IN",
      {
        month: "long",
        year: "numeric",
      }
    );
  }, []);

  // =========================
  // AI INSIGHT
  // =========================

  const aiInsight = useMemo(() => {
    if (sales.length === 0) {
      return "Start adding sales data to BizAI. The more sales history you have, the smarter your revenue forecast will become.";
    }

    if (revenueGrowth > 10) {
      return "🚀 Your revenue is growing strongly. Maintain your current sales strategy and focus on converting more interested leads.";
    }

    if (revenueGrowth > 0) {
      return "📈 Your business revenue is growing. Continue following up with leads and improve conversion opportunities.";
    }

    if (revenueGrowth < 0) {
      return "⚠️ Your latest revenue is lower than the previous month. Focus on pending payments, follow-ups and high-potential leads.";
    }

    return "📊 Your revenue is currently stable. Focus on generating more leads and increasing conversion rates.";
  }, [
    sales,
    revenueGrowth,
  ]);

  // =========================
  // FORMAT MONEY
  // =========================

  function formatMoney(amount: number) {
    return `₹${Math.round(
      amount
    ).toLocaleString("en-IN")}`;
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-4">
            🤖
          </div>

          <h2 className="text-xl font-semibold">
            BizAI is forecasting your revenue...
          </h2>

          <p className="text-slate-400 mt-2">
            Analyzing your sales history.
          </p>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">

          <div>

            <h1 className="text-3xl md:text-4xl font-bold">
              🔮 Revenue Forecast
            </h1>

            <p className="text-slate-400 mt-2">
              AI-powered predictions based on your
              business sales data.
            </p>

          </div>

          <button
            onClick={() => loadSales(true)}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-3 rounded-xl font-semibold"
          >
            {refreshing
              ? "🤖 Forecasting..."
              : "🔄 Refresh Forecast"}
          </button>

        </div>

        {/* AI FORECAST CARD */}

        <div className="bg-gradient-to-r from-purple-600/20 via-blue-600/10 to-slate-900 border border-purple-500/30 rounded-2xl p-6 md:p-8 mb-10">

          <p className="text-purple-400 text-sm font-semibold mb-3">
            🤖 BIZAI REVENUE PREDICTION
          </p>

          <h2 className="text-2xl md:text-3xl font-bold">

            Predicted revenue for {nextMonth}

          </h2>

          <p className="text-4xl md:text-5xl font-bold text-green-400 mt-5">

            {formatMoney(forecastRevenue)}

          </p>

          <p className="text-slate-300 mt-4 max-w-3xl">

            This prediction is calculated using
            your previous sales performance,
            average monthly revenue and recent
            revenue trend.

          </p>

        </div>

        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

          {/* TOTAL */}

          <div className="bg-slate-900 border border-green-500/30 rounded-xl p-5">

            <p className="text-green-400 text-sm">
              💰 Total Revenue
            </p>

            <p className="text-3xl font-bold mt-3">
              {formatMoney(totalRevenue)}
            </p>

          </div>

          {/* CURRENT MONTH */}

          <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">

            <p className="text-blue-400 text-sm">
              📅 This Month
            </p>

            <p className="text-3xl font-bold mt-3">
              {formatMoney(currentMonthRevenue)}
            </p>

          </div>

          {/* AVERAGE */}

          <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5">

            <p className="text-purple-400 text-sm">
              📊 Monthly Average
            </p>

            <p className="text-3xl font-bold mt-3">
              {formatMoney(averageRevenue)}
            </p>

          </div>

          {/* GROWTH */}

          <div className="bg-slate-900 border border-orange-500/30 rounded-xl p-5">

            <p className="text-orange-400 text-sm">
              📈 Revenue Growth
            </p>

            <p
              className={`text-3xl font-bold mt-3 ${
                revenueGrowth > 0
                  ? "text-green-400"
                  : revenueGrowth < 0
                  ? "text-red-400"
                  : "text-white"
              }`}
            >
              {revenueGrowth > 0 ? "+" : ""}
              {revenueGrowth.toFixed(1)}%
            </p>

          </div>

        </div>

        {/* BUSINESS PERFORMANCE */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

          {/* BEST MONTH */}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-xl font-bold mb-5">
              🏆 Best Revenue Month
            </h2>

            {bestMonth ? (

              <div>

                <p className="text-3xl font-bold text-yellow-400">

                  {bestMonth.month}

                </p>

                <p className="text-2xl font-semibold mt-3">

                  {formatMoney(
                    bestMonth.revenue
                  )}

                </p>

                <p className="text-slate-400 text-sm mt-3">

                  Your highest recorded monthly
                  revenue so far.

                </p>

              </div>

            ) : (

              <p className="text-slate-400">
                No sales data available yet.
              </p>

            )}

          </div>

          {/* SALES DATA */}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-xl font-bold mb-5">
              📦 Sales Performance
            </h2>

            <div className="space-y-4">

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Total Sales
                </span>

                <span className="font-bold">
                  {sales.length}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Paid Sales
                </span>

                <span className="font-bold text-green-400">

                  {
                    sales.filter(
                      (sale) =>
                        sale.payment_status ===
                          "Paid" ||
                        sale.payment_status ===
                          "Completed"
                    ).length
                  }

                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Pending Sales
                </span>

                <span className="font-bold text-yellow-400">

                  {
                    sales.filter(
                      (sale) =>
                        sale.payment_status ===
                        "Pending"
                    ).length
                  }

                </span>

              </div>

            </div>

          </div>

        </div>

        {/* AI BUSINESS INSIGHT */}

        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6 mb-10">

          <p className="text-blue-400 text-sm font-semibold mb-3">
            🤖 AI BUSINESS INSIGHT
          </p>

          <h2 className="text-xl md:text-2xl font-bold">

            {aiInsight}

          </h2>

        </div>

        {/* MONTHLY REVENUE */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-10">

          <h2 className="text-2xl font-bold mb-2">
            📈 Monthly Revenue History
          </h2>

          <p className="text-slate-400 text-sm mb-6">
            Your completed and paid sales
            performance by month.
          </p>

          {monthlyRevenue.length === 0 ? (

            <div className="text-center py-10 text-slate-400">

              No paid sales data available for
              forecasting yet.

            </div>

          ) : (

            <div className="space-y-4">

              {monthlyRevenue.map(
                (item) => {

                  const maxRevenue =
                    Math.max(
                      ...monthlyRevenue.map(
                        (month) =>
                          month.revenue
                      )
                    );

                  const percentage =
                    maxRevenue > 0
                      ? (item.revenue /
                          maxRevenue) *
                        100
                      : 0;

                  return (

                    <div
                      key={item.month}
                    >

                      <div className="flex justify-between mb-2">

                        <span className="font-semibold">
                          {item.month}
                        </span>

                        <span className="text-green-400 font-semibold">
                          {formatMoney(
                            item.revenue
                          )}
                        </span>

                      </div>

                      <div className="w-full bg-slate-800 rounded-full h-3">

                        <div
                          className="bg-blue-600 h-3 rounded-full"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </div>

        {/* HOW FORECAST WORKS */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

          <h2 className="text-xl font-bold mb-6">
            🤖 How BizAI Calculates Forecasts
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div>

              <div className="text-3xl mb-3">
                📊
              </div>

              <h3 className="font-bold">
                Sales History
              </h3>

              <p className="text-slate-400 text-sm mt-2">
                BizAI analyzes your previous
                paid and completed sales.

              </p>

            </div>

            <div>

              <div className="text-3xl mb-3">
                📈
              </div>

              <h3 className="font-bold">
                Revenue Trend
              </h3>

              <p className="text-slate-400 text-sm mt-2">
                Recent monthly growth or decline
                is included in the prediction.

              </p>

            </div>

            <div>

              <div className="text-3xl mb-3">
                🔮
              </div>

              <h3 className="font-bold">
                Smart Prediction
              </h3>

              <p className="text-slate-400 text-sm mt-2">
                BizAI combines average revenue
                and recent performance to predict
                your next month.

              </p>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}