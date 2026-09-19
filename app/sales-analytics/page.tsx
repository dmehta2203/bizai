"use client";

import FeatureGuard from "@/components/FeatureGuard";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// =====================================
// TYPES
// =====================================

type Sale = {
  id: string;
  user_id: string;
  customer_id: string | null;
  title: string;
  amount: number;
  sale_date: string | null;
  payment_status: string;
  notes: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
};

type CustomerRevenue = {
  id: string;
  name: string;
  revenue: number;
};

type MonthlyData = {
  month: string;
  revenue: number;
  sales: number;
};

// =====================================
// CHART COLORS
// =====================================

const PAYMENT_COLORS = [
  "#22c55e",
  "#eab308",
  "#f97316",
];

// =====================================
// CUSTOM TOOLTIP
// =====================================

function CustomTooltip({
  active,
  payload,
  label,
}: any) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 shadow-xl">

      <p className="text-white font-semibold mb-2">
        {label}
      </p>

      {payload.map(
        (item: any, index: number) => (

          <p
            key={index}
            className="text-sm text-slate-300"
          >
            {item.name}:{" "}

            <span className="font-semibold text-white">

              {item.name === "Revenue"
                ? `₹${Number(
                    item.value
                  ).toLocaleString("en-IN")}`
                : item.value}

            </span>

          </p>

        )
      )}

    </div>
  );
}

// =====================================
// SALES ANALYTICS CONTENT
// =====================================

function SalesAnalyticsContent() {

  const router = useRouter();

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [userId, setUserId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  // =====================================
  // LOAD USER + DATA
  // =====================================

  useEffect(() => {
    loadUserAndData();
  }, []);

  async function loadUserAndData() {

    setLoading(true);

    try {

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.user) {

        router.push("/login");

        return;

      }

      const currentUserId =
        session.user.id;

      setUserId(currentUserId);

      await Promise.all([
        fetchSales(currentUserId),
        fetchCustomers(currentUserId),
      ]);

    } catch (error) {

      console.error(
        "Error loading analytics:",
        error
      );

    } finally {

      setLoading(false);

    }
  }

  // =====================================
  // FETCH SALES
  // =====================================

  async function fetchSales(
    currentUserId?: string
  ) {

    const id =
      currentUserId || userId;

    if (!id) return;

    const { data, error } =
      await supabase
        .from("sales")
        .select("*")
        .eq("user_id", id)
        .order("sale_date", {
          ascending: true,
        });

    if (error) {

      console.error(
        "Error fetching sales:",
        error.message
      );

    } else {

      setSales(data || []);

    }
  }

  // =====================================
  // FETCH CUSTOMERS
  // =====================================

  async function fetchCustomers(
    currentUserId?: string
  ) {

    const id =
      currentUserId || userId;

    if (!id) return;

    const { data, error } =
      await supabase
        .from("customers")
        .select("id, name")
        .eq("user_id", id)
        .order("name");

    if (error) {

      console.error(
        "Error fetching customers:",
        error.message
      );

    } else {

      setCustomers(data || []);

    }
  }

  // =====================================
  // FORMAT MONEY
  // =====================================

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

  // =====================================
  // BASIC CALCULATIONS
  // =====================================

  const totalRevenue =
    useMemo(() => {

      return sales.reduce(
        (total, sale) =>
          total +
          Number(sale.amount),
        0
      );

    }, [sales]);


  const paidRevenue =
    useMemo(() => {

      return sales
        .filter(
          (sale) =>
            sale.payment_status ===
            "Paid"
        )
        .reduce(
          (total, sale) =>
            total +
            Number(sale.amount),
          0
        );

    }, [sales]);


  const pendingRevenue =
    useMemo(() => {

      return sales
        .filter(
          (sale) =>
            sale.payment_status ===
            "Pending"
        )
        .reduce(
          (total, sale) =>
            total +
            Number(sale.amount),
          0
        );

    }, [sales]);


  const partialRevenue =
    useMemo(() => {

      return sales
        .filter(
          (sale) =>
            sale.payment_status ===
            "Partial"
        )
        .reduce(
          (total, sale) =>
            total +
            Number(sale.amount),
          0
        );

    }, [sales]);


  const totalSales =
    sales.length;


  const averageSaleValue =
    totalSales > 0
      ? totalRevenue /
        totalSales
      : 0;

  // =====================================
  // PAYMENT COUNTS
  // =====================================

  const paidSales =
    sales.filter(
      (sale) =>
        sale.payment_status ===
        "Paid"
    ).length;


  const pendingSales =
    sales.filter(
      (sale) =>
        sale.payment_status ===
        "Pending"
    ).length;


  const partialSales =
    sales.filter(
      (sale) =>
        sale.payment_status ===
        "Partial"
    ).length;

  // =====================================
  // MONTHLY REVENUE + SALES
  // =====================================

  const monthlyRevenue =
    useMemo<MonthlyData[]>(() => {

      const months:
        Record<
          string,
          {
            revenue: number;
            sales: number;
            date: Date;
          }
        > = {};

      sales.forEach((sale) => {

        const dateValue =
          sale.sale_date ||
          sale.created_at;

        if (!dateValue) return;

        const date =
          new Date(dateValue);

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return;
        }

        const monthKey =
          date.toLocaleDateString(
            "en-IN",
            {
              month: "short",
              year: "numeric",
            }
          );

        if (!months[monthKey]) {

          months[monthKey] = {
            revenue: 0,
            sales: 0,
            date: new Date(
              date.getFullYear(),
              date.getMonth(),
              1
            ),
          };

        }

        months[monthKey].revenue +=
          Number(sale.amount);

        months[monthKey].sales += 1;

      });

      return Object.entries(months)
        .map(
          ([month, value]) => ({

            month,

            revenue:
              value.revenue,

            sales:
              value.sales,

            date:
              value.date,

          })
        )
        .sort(
          (a, b) =>
            a.date.getTime() -
            b.date.getTime()
        )
        .map(
          ({
            month,
            revenue,
            sales,
          }) => ({

            month,

            revenue,

            sales,

          })
        );

    }, [sales]);

  // =====================================
  // PAYMENT CHART DATA
  // =====================================

  const paymentChartData =
    useMemo(() => {

      return [
        {
          name: "Paid",
          value: paidSales,
          revenue: paidRevenue,
        },
        {
          name: "Pending",
          value: pendingSales,
          revenue: pendingRevenue,
        },
        {
          name: "Partial",
          value: partialSales,
          revenue: partialRevenue,
        },
      ].filter(
        (item) =>
          item.value > 0
      );

    }, [
      paidSales,
      pendingSales,
      partialSales,
      paidRevenue,
      pendingRevenue,
      partialRevenue,
    ]);

  // =====================================
  // CUSTOMER REVENUE
  // =====================================

  const customerRevenue =
    useMemo<CustomerRevenue[]>(() => {

      const revenueMap:
        Record<
          string,
          number
        > = {};

      sales.forEach((sale) => {

        if (!sale.customer_id) {
          return;
        }

        if (
          !revenueMap[
            sale.customer_id
          ]
        ) {

          revenueMap[
            sale.customer_id
          ] = 0;

        }

        revenueMap[
          sale.customer_id
        ] += Number(
          sale.amount
        );

      });

      const result =
        Object.entries(
          revenueMap
        ).map(
          ([
            customerId,
            revenue,
          ]) => {

            const customer =
              customers.find(
                (item) =>
                  item.id ===
                  customerId
              );

            return {

              id: customerId,

              name:
                customer?.name ||
                "Unknown Customer",

              revenue,

            };

          }
        );

      return result.sort(
        (a, b) =>
          b.revenue -
          a.revenue
      );

    }, [
      sales,
      customers,
    ]);

  // =====================================
  // TOP CUSTOMERS CHART
  // =====================================

  const topCustomersChart =
    customerRevenue
      .slice(0, 5)
      .map((customer) => ({
        name:
          customer.name.length > 12
            ? `${customer.name.slice(
                0,
                12
              )}...`
            : customer.name,
        revenue:
          customer.revenue,
      }));

  // =====================================
  // BEST MONTH
  // =====================================

  const bestMonth =
    useMemo(() => {

      if (
        monthlyRevenue.length === 0
      ) {
        return null;
      }

      return monthlyRevenue.reduce(
        (best, current) =>
          current.revenue >
          best.revenue
            ? current
            : best
      );

    }, [monthlyRevenue]);

  // =====================================
  // TOP CUSTOMER
  // =====================================

  const topCustomer =
    customerRevenue.length > 0
      ? customerRevenue[0]
      : null;

  // =====================================
  // REFRESH
  // =====================================

  async function refreshData() {

    if (!userId) return;

    setLoading(true);

    await Promise.all([
      fetchSales(userId),
      fetchCustomers(userId),
    ]);

    setLoading(false);

  }

  // =====================================
  // LOADING
  // =====================================

  if (loading) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="w-16 h-16 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />

          <p className="mt-5 text-slate-400">

            Loading sales analytics...

          </p>

        </div>

      </main>

    );

  }

  return (

    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">

      <div className="max-w-7xl mx-auto">

        {/* BACK */}

        <button
          onClick={() =>
            router.push(
              "/dashboard"
            )
          }
          className="text-blue-400 hover:text-blue-300 mb-6"
        >

          ← Back to Dashboard

        </button>


        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

          <div>

            <h1 className="text-3xl md:text-4xl font-bold">

              📊 Sales Analytics

            </h1>

            <p className="text-slate-400 mt-2">

              Track your business sales
              performance and revenue growth

            </p>

          </div>


          <div className="flex gap-3">

            <button
              onClick={() =>
                router.push("/sales")
              }
              className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-900 transition"
            >

              💰 Manage Sales

            </button>


            <button
              onClick={refreshData}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition font-semibold"
            >

              🔄 Refresh

            </button>

          </div>

        </div>


        {/* MAIN STATS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <p className="text-slate-400 text-sm">

              💰 Total Revenue

            </p>

            <h2 className="text-2xl font-bold text-green-400 mt-3">

              {formatMoney(
                totalRevenue
              )}

            </h2>

            <p className="text-slate-500 text-sm mt-3">

              From {totalSales} total sales

            </p>

          </div>


          <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6">

            <p className="text-green-400 text-sm">

              ✅ Paid Revenue

            </p>

            <h2 className="text-2xl font-bold mt-3">

              {formatMoney(
                paidRevenue
              )}

            </h2>

            <p className="text-slate-500 text-sm mt-3">

              {paidSales} paid sales

            </p>

          </div>


          <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl p-6">

            <p className="text-yellow-400 text-sm">

              ⏳ Pending Revenue

            </p>

            <h2 className="text-2xl font-bold mt-3">

              {formatMoney(
                pendingRevenue
              )}

            </h2>

            <p className="text-slate-500 text-sm mt-3">

              {pendingSales} pending sales

            </p>

          </div>


          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6">

            <p className="text-purple-400 text-sm">

              📈 Average Sale

            </p>

            <h2 className="text-2xl font-bold mt-3">

              {formatMoney(
                averageSaleValue
              )}

            </h2>

            <p className="text-slate-500 text-sm mt-3">

              Average value per sale

            </p>

          </div>

        </div>


        {/* =============================== */}
        {/* MONTHLY REVENUE LINE CHART */}
        {/* =============================== */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 mb-8">

          <h2 className="text-2xl font-bold">

            📈 Monthly Revenue Growth

          </h2>

          <p className="text-slate-400 mt-2 mb-8">

            Track your revenue growth
            month by month

          </p>


          {monthlyRevenue.length === 0 ? (

            <div className="text-center py-16 text-slate-400">

              📊 Add sales to see your
              revenue graph.

            </div>

          ) : (

            <div className="h-[350px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={monthlyRevenue}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                  />

                  <XAxis
                    dataKey="month"
                    stroke="#94a3b8"
                  />

                  <YAxis
                    stroke="#94a3b8"
                    tickFormatter={(value) =>
                      `₹${Number(
                        value
                      ).toLocaleString(
                        "en-IN"
                      )}`
                    }
                  />

                  <Tooltip
                    content={
                      <CustomTooltip />
                    }
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{
                      r: 5,
                    }}
                    activeDot={{
                      r: 8,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          )}

        </div>


        {/* =============================== */}
        {/* MONTHLY SALES BAR CHART */}
        {/* =============================== */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 mb-8">

          <h2 className="text-2xl font-bold">

            📊 Monthly Sales

          </h2>

          <p className="text-slate-400 mt-2 mb-8">

            Number of sales each month

          </p>


          {monthlyRevenue.length === 0 ? (

            <div className="text-center py-16 text-slate-400">

              No sales data available.

            </div>

          ) : (

            <div className="h-[350px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={monthlyRevenue}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                  />

                  <XAxis
                    dataKey="month"
                    stroke="#94a3b8"
                  />

                  <YAxis
                    stroke="#94a3b8"
                  />

                  <Tooltip
                    content={
                      <CustomTooltip />
                    }
                  />

                  <Legend />

                  <Bar
                    dataKey="sales"
                    name="Sales"
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

          )}

        </div>


        {/* =============================== */}
        {/* PAYMENT + TOP CUSTOMERS */}
        {/* =============================== */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">


          {/* PAYMENT PIE CHART */}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-2xl font-bold">

              💳 Payment Status

            </h2>

            <p className="text-slate-400 mt-2 mb-6">

              Sales payment distribution

            </p>


            {paymentChartData.length === 0 ? (

              <div className="text-center py-16 text-slate-400">

                No payment data available.

              </div>

            ) : (

              <div className="h-[350px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={
                        paymentChartData
                      }
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label
                    >

                      {paymentChartData.map(
                        (
                          _,
                          index
                        ) => (

                          <Cell
                            key={index}
                            fill={
                              PAYMENT_COLORS[
                                index %
                                  PAYMENT_COLORS.length
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

            )}

          </div>


          {/* TOP CUSTOMERS BAR CHART */}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-2xl font-bold">

              🏆 Top Customers

            </h2>

            <p className="text-slate-400 mt-2 mb-6">

              Customers generating the
              highest revenue

            </p>


            {topCustomersChart.length === 0 ? (

              <div className="text-center py-16 text-slate-400">

                Link sales with customers
                to see this graph.

              </div>

            ) : (

              <div className="h-[350px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={
                      topCustomersChart
                    }
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
                      tickFormatter={(
                        value
                      ) =>
                        `₹${Number(
                          value
                        ).toLocaleString(
                          "en-IN"
                        )}`
                      }
                    />

                    <Tooltip
                      content={
                        <CustomTooltip />
                      }
                    />

                    <Legend />

                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="#a855f7"
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

            )}

          </div>

        </div>


        {/* =============================== */}
        {/* PERFORMANCE INSIGHTS */}
        {/* =============================== */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">

            <p className="text-blue-400 text-sm">

              📅 Best Performing Month

            </p>

            <h2 className="text-xl font-bold mt-3">

              {bestMonth
                ? bestMonth.month
                : "No Data"}

            </h2>

            <p className="text-slate-400 mt-2">

              {bestMonth
                ? formatMoney(
                    bestMonth.revenue
                  )
                : "Add sales to see data"}

            </p>

          </div>


          <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-6">

            <p className="text-purple-400 text-sm">

              🏆 Top Customer

            </p>

            <h2 className="text-xl font-bold mt-3">

              {topCustomer
                ? topCustomer.name
                : "No Customer Data"}

            </h2>

            <p className="text-slate-400 mt-2">

              {topCustomer
                ? formatMoney(
                    topCustomer.revenue
                  )
                : "Link sales with customers"}

            </p>

          </div>


          <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6">

            <p className="text-orange-400 text-sm">

              💰 Partial Payments

            </p>

            <h2 className="text-xl font-bold mt-3">

              {formatMoney(
                partialRevenue
              )}

            </h2>

            <p className="text-slate-400 mt-2">

              {partialSales} partial sales

            </p>

          </div>

        </div>


        {/* =============================== */}
        {/* REVENUE BREAKDOWN */}
        {/* =============================== */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 mb-10">

          <h2 className="text-2xl font-bold mb-6">

            💰 Revenue Breakdown

          </h2>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            <div className="bg-green-500/10 rounded-xl p-5">

              <p className="text-slate-400">

                ✅ Paid Revenue

              </p>

              <h3 className="text-xl font-bold text-green-400 mt-3">

                {formatMoney(
                  paidRevenue
                )}

              </h3>

            </div>


            <div className="bg-yellow-500/10 rounded-xl p-5">

              <p className="text-slate-400">

                ⏳ Pending Revenue

              </p>

              <h3 className="text-xl font-bold text-yellow-400 mt-3">

                {formatMoney(
                  pendingRevenue
                )}

              </h3>

            </div>


            <div className="bg-orange-500/10 rounded-xl p-5">

              <p className="text-slate-400">

                💰 Partial Revenue

              </p>

              <h3 className="text-xl font-bold text-orange-400 mt-3">

                {formatMoney(
                  partialRevenue
                )}

              </h3>

            </div>

          </div>

        </div>


        {/* =============================== */}
        {/* SMART SUMMARY */}
        {/* =============================== */}

        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-2xl p-6 md:p-8 mb-10">

          <h2 className="text-2xl font-bold mb-5">

            🤖 Sales Performance Summary

          </h2>


          <div className="space-y-3 text-slate-300">

            <p>

              💰 Your business has generated{" "}

              <span className="text-green-400 font-semibold">

                {formatMoney(
                  totalRevenue
                )}

              </span>

              {" "}from{" "}

              <span className="text-white font-semibold">

                {totalSales} sales.

              </span>

            </p>


            <p>

              📈 Your average sale value is{" "}

              <span className="text-purple-400 font-semibold">

                {formatMoney(
                  averageSaleValue
                )}

              </span>

              .

            </p>


            {bestMonth && (

              <p>

                🏆 Your best performing month is{" "}

                <span className="text-blue-400 font-semibold">

                  {bestMonth.month}

                </span>

                {" "}with{" "}

                <span className="text-green-400 font-semibold">

                  {formatMoney(
                    bestMonth.revenue
                  )}

                </span>

                {" "}in revenue.

              </p>

            )}


            {topCustomer && (

              <p>

                👑 Your top customer is{" "}

                <span className="text-purple-400 font-semibold">

                  {topCustomer.name}

                </span>

                {" "}with{" "}

                <span className="text-green-400 font-semibold">

                  {formatMoney(
                    topCustomer.revenue
                  )}

                </span>

                {" "}in sales.

              </p>

            )}


            {pendingRevenue > 0 && (

              <p className="text-yellow-300">

                ⚠️ You have{" "}

                <span className="font-semibold">

                  {formatMoney(
                    pendingRevenue
                  )}

                </span>

                {" "}in pending payments.
                Consider following up with
                these customers.

              </p>

            )}

          </div>

        </div>


        {/* EMPTY STATE */}

        {sales.length === 0 && (

          <div className="text-center bg-slate-900 border border-slate-800 rounded-2xl p-10">

            <div className="text-5xl mb-5">

              📊

            </div>

            <h2 className="text-2xl font-bold">

              No Sales Data Yet

            </h2>

            <p className="text-slate-400 mt-3">

              Start adding sales to unlock
              your business analytics.

            </p>


            <button
              onClick={() =>
                router.push("/sales")
              }
              className="mt-6 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-semibold"
            >

              💰 Add Your First Sale

            </button>

          </div>

        )}

      </div>

    </main>

  );
}

// =====================================
// FEATURE GUARD
// =====================================

export default function SalesAnalyticsPage() {

  return (

    <FeatureGuard
      feature="salesAnalytics"
    >

      <SalesAnalyticsContent />

    </FeatureGuard>

  );
}