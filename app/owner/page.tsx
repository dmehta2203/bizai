"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import OwnerProtectedRoute from "@/components/OwnerProtectedRoute";
import { useRouter } from "next/navigation";

type OwnerStats = {
  totalUsers: number;
  activeSubscriptions: number;
  totalSubscriptions: number;
  totalRevenue: number;
  totalTransactions: number;
  totalCustomers: number;
  totalLeads: number;
  totalTasks: number;
  totalSales: number;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
};

type Subscription = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  amount: number | null;
  created_at: string;
};

type Transaction = {
  id: string;
  user_id: string;
  amount: number | null;
  status?: string | null;
  payment_status?: string | null;
  created_at: string;
};

function OwnerDashboardContent() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [stats, setStats] =
    useState<OwnerStats>({
      totalUsers: 0,
      activeSubscriptions: 0,
      totalSubscriptions: 0,
      totalRevenue: 0,
      totalTransactions: 0,
      totalCustomers: 0,
      totalLeads: 0,
      totalTasks: 0,
      totalSales: 0,
    });

  const [recentUsers, setRecentUsers] =
    useState<UserProfile[]>([]);

  const [recentSubscriptions, setRecentSubscriptions] =
    useState<Subscription[]>([]);

  const [recentTransactions, setRecentTransactions] =
    useState<Transaction[]>([]);

  const [error, setError] =
    useState("");


  useEffect(() => {
    loadOwnerDashboard();
  }, []);


  // =====================================
  // LOAD OWNER DASHBOARD
  // =====================================

  async function loadOwnerDashboard() {

    try {

      setLoading(true);
      setError("");


      // =====================================
      // LOAD ALL PLATFORM DATA
      // =====================================

      const [
        usersResult,
        subscriptionsResult,
        transactionsResult,
        customersResult,
        leadsResult,
        tasksResult,
        salesResult,
      ] =
        await Promise.all([

          supabase
            .from("profiles")
            .select("*")
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),

          supabase
            .from("subscriptions")
            .select("*")
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),

          supabase
            .from("transactions")
            .select("*")
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),

          supabase
            .from("customers")
            .select("*"),

          supabase
            .from("leads")
            .select("*"),

          supabase
            .from("tasks")
            .select("*"),

          supabase
            .from("sales")
            .select("*"),

        ]);


      // =====================================
      // CHECK ERRORS
      // =====================================

      if (usersResult.error) {

        console.error(
          "Users error:",
          usersResult.error
        );

      }


      if (subscriptionsResult.error) {

        console.error(
          "Subscriptions error:",
          subscriptionsResult.error
        );

      }


      if (transactionsResult.error) {

        console.error(
          "Transactions error:",
          transactionsResult.error
        );

      }


      // =====================================
      // GET DATA
      // =====================================

      const users =
        usersResult.data || [];

      const subscriptions =
        subscriptionsResult.data || [];

      const transactions =
        transactionsResult.data || [];

      const customers =
        customersResult.data || [];

      const leads =
        leadsResult.data || [];

      const tasks =
        tasksResult.data || [];

      const sales =
        salesResult.data || [];


      // =====================================
      // ACTIVE SUBSCRIPTIONS
      // =====================================

      const activeSubscriptions =
        subscriptions.filter(
          (subscription) =>
            subscription.status
              ?.toLowerCase() ===
            "active"
        ).length;


      // =====================================
      // TOTAL REVENUE
      // =====================================

      const totalRevenue =
        transactions
          .filter(
            (transaction) => {

              const status =
                transaction.status ||
                transaction.payment_status ||
                "";

              return (
                status
                  .toLowerCase() ===
                "paid" ||

                status
                  .toLowerCase() ===
                "success" ||

                status
                  .toLowerCase() ===
                "completed"
              );

            }
          )
          .reduce(
            (total, transaction) =>
              total +
              Number(
                transaction.amount || 0
              ),

            0
          );


      // =====================================
      // SET STATS
      // =====================================

      setStats({

        totalUsers:
          users.length,

        activeSubscriptions,

        totalSubscriptions:
          subscriptions.length,

        totalRevenue,

        totalTransactions:
          transactions.length,

        totalCustomers:
          customers.length,

        totalLeads:
          leads.length,

        totalTasks:
          tasks.length,

        totalSales:
          sales.length,

      });


      // =====================================
      // RECENT USERS
      // =====================================

      setRecentUsers(
        users.slice(0, 5)
      );


      // =====================================
      // RECENT SUBSCRIPTIONS
      // =====================================

      setRecentSubscriptions(
        subscriptions.slice(0, 5)
      );


      // =====================================
      // RECENT TRANSACTIONS
      // =====================================

      setRecentTransactions(
        transactions.slice(0, 5)
      );

    } catch (error) {

      console.error(
        "Owner dashboard error:",
        error
      );

      setError(
        "Unable to load owner dashboard."
      );

    } finally {

      setLoading(false);

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
  // FORMAT DATE
  // =====================================

  function formatDate(
    date: string
  ) {

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "numeric",

        month: "short",

        year: "numeric",
      }
    ).format(
      new Date(date)
    );

  }


  // =====================================
  // GET USER NAME
  // =====================================

  function getUserName(
    userId: string
  ) {

    const user =
      recentUsers.find(
        (user) =>
          user.id === userId
      );

    if (user?.full_name) {

      return user.full_name;

    }

    if (user?.email) {

      return user.email;

    }

    return "Unknown User";

  }


  // =====================================
  // LOADING
  // =====================================

  if (loading) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-6xl mb-5 animate-pulse">
            👑
          </div>

          <h2 className="text-xl font-bold">
            Loading Owner Dashboard...
          </h2>

          <p className="text-slate-400 mt-2">
            Analyzing your BizAI platform.
          </p>

        </div>

      </main>

    );

  }


  // =====================================
  // ERROR
  // =====================================

  if (error) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center">

          <div className="text-5xl mb-5">
            ⚠️
          </div>

          <h2 className="text-2xl font-bold">
            Unable to Load Dashboard
          </h2>

          <p className="text-slate-400 mt-3">
            {error}
          </p>

          <button
            onClick={
              loadOwnerDashboard
            }
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-semibold"
          >
            🔄 Try Again
          </button>

        </div>

      </main>

    );

  }


  // =====================================
  // MAIN DASHBOARD
  // =====================================

  return (

    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">


        {/* ================================= */}
        {/* HEADER */}
        {/* ================================= */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

          <div>

            <p className="text-purple-400 font-semibold text-sm">
              BIZAI PLATFORM CONTROL
            </p>

            <h1 className="text-3xl md:text-5xl font-bold mt-2">
              👑 Owner Dashboard
            </h1>

            <p className="text-slate-400 mt-3">
              Monitor users, subscriptions,
              payments and your entire BizAI platform.
            </p>

          </div>


          <div className="flex gap-3 flex-wrap">

            <button
              onClick={
                loadOwnerDashboard
              }
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-3 rounded-xl font-semibold transition"
            >
              🔄 Refresh
            </button>


            <button
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold transition"
            >
              👤 User Dashboard
            </button>

          </div>

        </div>


        {/* ================================= */}
        {/* MAIN STATS */}
        {/* ================================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">


          {/* USERS */}

          <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-6">

            <p className="text-slate-400">
              👥 Total Users
            </p>

            <p className="text-4xl font-bold text-blue-400 mt-3">
              {stats.totalUsers}
            </p>

            <p className="text-slate-500 text-sm mt-2">
              Registered BizAI users
            </p>

          </div>


          {/* ACTIVE SUBSCRIPTIONS */}

          <div className="bg-slate-900 border border-purple-500/20 rounded-2xl p-6">

            <p className="text-slate-400">
              💳 Active Plans
            </p>

            <p className="text-4xl font-bold text-purple-400 mt-3">
              {stats.activeSubscriptions}
            </p>

            <p className="text-slate-500 text-sm mt-2">
              Active subscriptions
            </p>

          </div>


          {/* REVENUE */}

          <div className="bg-slate-900 border border-green-500/20 rounded-2xl p-6">

            <p className="text-slate-400">
              💰 Platform Revenue
            </p>

            <p className="text-3xl font-bold text-green-400 mt-3">
              {formatMoney(
                stats.totalRevenue
              )}
            </p>

            <p className="text-slate-500 text-sm mt-2">
              Successful payments
            </p>

          </div>


          {/* TRANSACTIONS */}

          <div className="bg-slate-900 border border-orange-500/20 rounded-2xl p-6">

            <p className="text-slate-400">
              💵 Transactions
            </p>

            <p className="text-4xl font-bold text-orange-400 mt-3">
              {stats.totalTransactions}
            </p>

            <p className="text-slate-500 text-sm mt-2">
              Total payment records
            </p>

          </div>

        </div>


        {/* ================================= */}
        {/* PLATFORM ACTIVITY */}
        {/* ================================= */}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              👥 Customers
            </p>

            <p className="text-3xl font-bold mt-2">
              {stats.totalCustomers}
            </p>

          </div>


          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              🎯 Leads
            </p>

            <p className="text-3xl font-bold mt-2">
              {stats.totalLeads}
            </p>

          </div>


          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              📋 Tasks
            </p>

            <p className="text-3xl font-bold mt-2">
              {stats.totalTasks}
            </p>

          </div>


          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              💰 Sales Records
            </p>

            <p className="text-3xl font-bold mt-2">
              {stats.totalSales}
            </p>

          </div>

        </div>


        {/* ================================= */}
        {/* QUICK ACTIONS */}
        {/* ================================= */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">


          <button
            onClick={() =>
              router.push(
                "/owner/users"
              )
            }
            className="bg-blue-600 hover:bg-blue-700 rounded-2xl p-6 text-left transition"
          >

            <div className="text-4xl mb-4">
              👥
            </div>

            <h3 className="text-xl font-bold">
              Manage Users
            </h3>

            <p className="text-blue-100 mt-2 text-sm">
              View all BizAI users and their activity.
            </p>

          </button>


          <button
            onClick={() =>
              router.push(
                "/owner/payments"
              )
            }
            className="bg-green-600 hover:bg-green-700 rounded-2xl p-6 text-left transition"
          >

            <div className="text-4xl mb-4">
              💳
            </div>

            <h3 className="text-xl font-bold">
              Payments
            </h3>

            <p className="text-green-100 mt-2 text-sm">
              Monitor payments and revenue.
            </p>

          </button>


          <button
            onClick={() =>
              router.push(
                "/owner/subscriptions"
              )
            }
            className="bg-purple-600 hover:bg-purple-700 rounded-2xl p-6 text-left transition"
          >

            <div className="text-4xl mb-4">
              👑
            </div>

            <h3 className="text-xl font-bold">
              Subscriptions
            </h3>

            <p className="text-purple-100 mt-2 text-sm">
              View all user subscription plans.
            </p>

          </button>

        </div>


        {/* ================================= */}
        {/* RECENT USERS */}
        {/* ================================= */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

          <div className="flex items-center justify-between mb-6">

            <div>

              <h2 className="text-2xl font-bold">
                👥 Recent Users
              </h2>

              <p className="text-slate-400 text-sm mt-1">
                Latest people using BizAI
              </p>

            </div>


            <button
              onClick={() =>
                router.push(
                  "/owner/users"
                )
              }
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              View All →
            </button>

          </div>


          {recentUsers.length === 0 ? (

            <div className="text-center py-10 text-slate-500">

              No users found.

            </div>

          ) : (

            <div className="space-y-3">

              {recentUsers.map(
                (user) => (

                  <div
                    key={user.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >

                    <div>

                      <p className="font-semibold">

                        👤{" "}

                        {user.full_name ||
                          "BizAI User"}

                      </p>

                      <p className="text-slate-400 text-sm mt-1">

                        {user.email}

                      </p>

                    </div>


                    <div className="flex items-center gap-4">

                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          user.role ===
                          "owner"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >

                        {user.role ===
                        "owner"
                          ? "👑 Owner"
                          : "👤 User"}

                      </span>


                      <span className="text-slate-500 text-sm">

                        {formatDate(
                          user.created_at
                        )}

                      </span>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>


        {/* ================================= */}
        {/* RECENT SUBSCRIPTIONS */}
        {/* ================================= */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

          <div className="flex items-center justify-between mb-6">

            <div>

              <h2 className="text-2xl font-bold">
                👑 Recent Subscriptions
              </h2>

              <p className="text-slate-400 text-sm mt-1">
                Latest subscription activity
              </p>

            </div>


            <button
              onClick={() =>
                router.push(
                  "/owner/subscriptions"
                )
              }
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              View All →
            </button>

          </div>


          {recentSubscriptions.length === 0 ? (

            <div className="text-center py-10 text-slate-500">

              No subscriptions found.

            </div>

          ) : (

            <div className="space-y-3">

              {recentSubscriptions.map(
                (subscription) => (

                  <div
                    key={subscription.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >

                    <div>

                      <p className="font-semibold">

                        👤{" "}

                        {getUserName(
                          subscription.user_id
                        )}

                      </p>

                      <p className="text-slate-400 text-sm mt-1">

                        👑 {subscription.plan}

                      </p>

                    </div>


                    <div className="flex items-center gap-4">

                      <span className="text-green-400 font-semibold">

                        {formatMoney(
                          Number(
                            subscription.amount ||
                            0
                          )
                        )}

                      </span>


                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          subscription.status
                            ?.toLowerCase() ===
                          "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >

                        {subscription.status}

                      </span>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>


        {/* ================================= */}
        {/* RECENT PAYMENTS */}
        {/* ================================= */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

          <div className="flex items-center justify-between mb-6">

            <div>

              <h2 className="text-2xl font-bold">
                💳 Recent Payments
              </h2>

              <p className="text-slate-400 text-sm mt-1">
                Latest payment transactions
              </p>

            </div>


            <button
              onClick={() =>
                router.push(
                  "/owner/payments"
                )
              }
              className="text-green-400 hover:text-green-300 text-sm"
            >
              View All →
            </button>

          </div>


          {recentTransactions.length === 0 ? (

            <div className="text-center py-10 text-slate-500">

              No transactions found.

            </div>

          ) : (

            <div className="space-y-3">

              {recentTransactions.map(
                (transaction) => {

                  const paymentStatus =
                    transaction.status ||
                    transaction.payment_status ||
                    "Unknown";

                  return (

                    <div
                      key={transaction.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    >

                      <div>

                        <p className="font-semibold">

                          👤{" "}

                          {getUserName(
                            transaction.user_id
                          )}

                        </p>

                        <p className="text-slate-500 text-sm mt-1">

                          {formatDate(
                            transaction.created_at
                          )}

                        </p>

                      </div>


                      <div className="flex items-center gap-4">

                        <span className="text-green-400 font-bold">

                          {formatMoney(
                            Number(
                              transaction.amount ||
                              0
                            )
                          )}

                        </span>


                        <span className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-400">

                          {paymentStatus}

                        </span>

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          )}

        </div>


      </div>

    </main>

  );

}


// =====================================
// PROTECTED OWNER PAGE
// =====================================

export default function OwnerDashboardPage() {

  return (

    <OwnerProtectedRoute>

      <OwnerDashboardContent />

    </OwnerProtectedRoute>

  );

}