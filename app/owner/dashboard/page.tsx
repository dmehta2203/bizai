"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import OwnerProtectedRoute from "@/components/OwnerProtectedRoute";
import Link from "next/link";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
};

type Subscription = {
  id: string;
  user_id: string;
  plan: string | null;
  status: string | null;
  amount: number | null;
  billing_cycle: string | null;
  created_at: string | null;
};

function OwnerDashboardContent() {
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [subscriptions, setSubscriptions] = useState<
    Subscription[]
  >([]);

  const [error, setError] = useState("");


  useEffect(() => {
    loadDashboard();
  }, []);


  // ==============================
  // LOAD DASHBOARD DATA
  // ==============================

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");


      // ==========================
      // LOAD PROFILES
      // ==========================

      const {
        data: profilesData,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        });


      if (profilesError) {
        throw profilesError;
      }


      // ==========================
      // REMOVE OWNER FROM USERS
      // ==========================

      const actualUsers =
        (profilesData || []).filter(
          (profile) =>
            profile.role?.toLowerCase() !==
            "owner"
        );


      // ==========================
      // GET ACTUAL USER IDS
      // ==========================

      const actualUserIds =
        actualUsers.map(
          (user) => user.id
        );


      // ==========================
      // LOAD SUBSCRIPTIONS
      // ==========================

      const {
        data: subscriptionsData,
        error: subscriptionsError,
      } = await supabase
        .from("subscriptions")
        .select(`
          id,
          user_id,
          plan,
          status,
          amount,
          billing_cycle,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        });


      if (subscriptionsError) {
        throw subscriptionsError;
      }


      // ==========================
      // REMOVE OWNER SUBSCRIPTIONS
      // ==========================

      const actualSubscriptions =
        (subscriptionsData || []).filter(
          (subscription) =>
            actualUserIds.includes(
              subscription.user_id
            )
        );


      // ==========================
      // SAVE FILTERED DATA
      // ==========================

      setProfiles(
        actualUsers
      );

      setSubscriptions(
        actualSubscriptions
      );


    } catch (error: any) {

      console.error(
        "Dashboard error:",
        error
      );

      setError(
        error.message ||
        "Unable to load dashboard."
      );

    } finally {

      setLoading(false);

    }
  }


  // ==============================
  // FORMAT MONEY
  // ==============================

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


  // ==============================
  // FORMAT DATE
  // ==============================

  function formatDate(
    date: string | null
  ) {

    if (!date) {
      return "Not available";
    }

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


  // ==============================
  // DASHBOARD CALCULATIONS
  // ==============================

  const totalUsers =
    profiles.length;


  const totalSubscriptions =
    subscriptions.length;


  const activeSubscribers =
    subscriptions.filter(
      (subscription) =>
        subscription.status
          ?.toLowerCase() ===
        "active"
    ).length;


  const inactiveSubscribers =
    subscriptions.filter(
      (subscription) =>
        subscription.status
          ?.toLowerCase() !==
        "active"
    ).length;


  // ==============================
  // TOTAL REVENUE
  // ==============================

  const totalRevenue =
    subscriptions
      .filter(
        (subscription) =>
          subscription.status
            ?.toLowerCase() ===
          "active"
      )
      .reduce(
        (total, subscription) =>
          total +
          Number(
            subscription.amount || 0
          ),
        0
      );


  // ==============================
  // PLAN COUNTS
  // ==============================

  const starterPlans =
    subscriptions.filter(
      (subscription) =>
        subscription.plan
          ?.toLowerCase()
          .includes("starter")
    ).length;


  const professionalPlans =
    subscriptions.filter(
      (subscription) =>
        subscription.plan
          ?.toLowerCase()
          .includes("professional")
    ).length;


  const businessPlans =
    subscriptions.filter(
      (subscription) =>
        subscription.plan
          ?.toLowerCase()
          .includes("business")
    ).length;


  // ==============================
  // RECENT USERS
  // ==============================

  const recentUsers =
    profiles.slice(0, 5);


  // ==============================
  // USERS WITH SUBSCRIPTIONS
  // ==============================

  const subscribedUserIds =
    new Set(
      subscriptions.map(
        (subscription) =>
          subscription.user_id
      )
    );


  const usersWithoutPlan =
    profiles.filter(
      (user) =>
        !subscribedUserIds.has(
          user.id
        )
    ).length;


  // ==============================
  // LOADING
  // ==============================

  if (loading) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-6xl animate-pulse mb-5">

            👑

          </div>

          <h1 className="text-2xl font-bold">

            Loading Owner Dashboard...

          </h1>

          <p className="text-slate-400 mt-3">

            Preparing BizAI analytics

          </p>

        </div>

      </main>

    );

  }


  // ==============================
  // ERROR
  // ==============================

  if (error) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center">

          <div className="text-5xl">

            ⚠️

          </div>

          <h1 className="text-2xl font-bold mt-5">

            Dashboard Error

          </h1>

          <p className="text-slate-400 mt-3">

            {error}

          </p>

          <button
            onClick={loadDashboard}
            className="mt-6 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-semibold"
          >

            🔄 Try Again

          </button>

        </div>

      </main>

    );

  }


  // ==============================
  // MAIN DASHBOARD
  // ==============================

  return (

    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">


        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

          <div>

            <p className="text-purple-400 font-semibold text-sm">

              BIZAI OWNER PANEL

            </p>

            <h1 className="text-3xl md:text-5xl font-bold mt-2">

              👑 Owner Dashboard

            </h1>

            <p className="text-slate-400 mt-3">

              Complete overview of your BizAI platform.

            </p>

          </div>


          <button
            onClick={loadDashboard}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-xl font-semibold"
          >

            🔄 Refresh Dashboard

          </button>

        </div>


        {/* MAIN STATISTICS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">


          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              👥 Total Users

            </p>

            <h2 className="text-4xl font-bold text-blue-400 mt-4">

              {totalUsers}

            </h2>

          </div>


          <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              🟢 Active Subscribers

            </p>

            <h2 className="text-4xl font-bold text-green-400 mt-4">

              {activeSubscribers}

            </h2>

          </div>


          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              💳 Subscriptions

            </p>

            <h2 className="text-4xl font-bold text-purple-400 mt-4">

              {totalSubscriptions}

            </h2>

          </div>


          <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              💰 Total Revenue

            </p>

            <h2 className="text-3xl font-bold text-yellow-400 mt-4">

              {formatMoney(totalRevenue)}

            </h2>

          </div>


        </div>


        {/* SECONDARY STATISTICS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">


          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              🔴 Inactive Subscriptions

            </p>

            <h2 className="text-4xl font-bold text-red-400 mt-4">

              {inactiveSubscribers}

            </h2>

          </div>


          <div className="bg-slate-900 border border-orange-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              ⚠️ Users Without Plan

            </p>

            <h2 className="text-4xl font-bold text-orange-400 mt-4">

              {usersWithoutPlan}

            </h2>

          </div>


        </div>


        {/* PLAN ANALYTICS */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

          <h2 className="text-2xl font-bold">

            📊 Subscription Plans

          </h2>

          <p className="text-slate-400 text-sm mt-1 mb-6">

            Overview of selected plans.

          </p>


          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">


            <div className="bg-slate-950 border border-blue-500/30 rounded-xl p-6">

              <p className="text-blue-400">

                Starter Plan

              </p>

              <h3 className="text-4xl font-bold mt-4">

                {starterPlans}

              </h3>

            </div>


            <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-6">

              <p className="text-purple-400">

                Professional Plan

              </p>

              <h3 className="text-4xl font-bold mt-4">

                {professionalPlans}

              </h3>

            </div>


            <div className="bg-slate-950 border border-green-500/30 rounded-xl p-6">

              <p className="text-green-400">

                Business Plan

              </p>

              <h3 className="text-4xl font-bold mt-4">

                {businessPlans}

              </h3>

            </div>


          </div>

        </div>


        {/* RECENT USERS */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-8">


          <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            <div>

              <h2 className="text-2xl font-bold">

                🆕 Recent Users

              </h2>

              <p className="text-slate-400 text-sm mt-1">

                Latest registered users on BizAI.

              </p>

            </div>


            <Link
              href="/owner/users"
              className="bg-purple-600 hover:bg-purple-700 px-5 py-3 rounded-xl font-semibold transition w-fit"
            >

              View All Users →

            </Link>

          </div>


          {recentUsers.length === 0 ? (

            <div className="text-center py-16 text-slate-500">

              <div className="text-6xl mb-4">

                👥

              </div>

              No users found.

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-left min-w-[700px]">

                <thead>

                  <tr className="border-b border-slate-800 text-slate-400 text-sm">

                    <th className="p-5">
                      User
                    </th>

                    <th className="p-5">
                      Email
                    </th>

                    <th className="p-5">
                      Role
                    </th>

                    <th className="p-5">
                      Joined
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {recentUsers.map(
                    (user) => (

                      <tr
                        key={user.id}
                        className="border-b border-slate-800/70 hover:bg-slate-800/40 transition"
                      >

                        <td className="p-5">

                          <div>

                            <p className="font-semibold">

                              {user.full_name ||
                                "BizAI User"}

                            </p>

                            <p className="text-xs text-slate-500 mt-1">

                              ID:{" "}

                              {user.id.slice(
                                0,
                                10
                              )}...

                            </p>

                          </div>

                        </td>


                        <td className="p-5 text-blue-400">

                          {user.email ||
                            "Not available"}

                        </td>


                        <td className="p-5">

                          <span className="px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400">

                            {user.role ||
                              "user"}

                          </span>

                        </td>


                        <td className="p-5 text-slate-400">

                          {formatDate(
                            user.created_at
                          )}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* QUICK ACTIONS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">


          <Link
            href="/owner/users"
            className="bg-purple-600 hover:bg-purple-700 rounded-2xl p-6 transition"
          >

            <div className="text-4xl">

              👥

            </div>

            <h3 className="text-xl font-bold mt-4">

              Manage Users

            </h3>

            <p className="text-purple-100 mt-2">

              View user profiles and subscriptions.

            </p>

          </Link>


          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <div className="text-4xl">

              💰

            </div>

            <h3 className="text-xl font-bold mt-4">

              Platform Revenue

            </h3>

            <p className="text-slate-400 mt-2">

              Current tracked revenue:

            </p>

            <p className="text-2xl font-bold text-green-400 mt-3">

              {formatMoney(totalRevenue)}

            </p>

          </div>


        </div>


        {/* FOOTER */}

        <div className="text-center text-slate-600 text-sm mt-10">

          👑 BizAI Owner Panel • Platform Analytics

        </div>


      </div>

    </main>

  );

}


// ==============================
// PROTECTED OWNER PAGE
// ==============================

export default function OwnerDashboardPage() {

  return (

    <OwnerProtectedRoute>

      <OwnerDashboardContent />

    </OwnerProtectedRoute>

  );

}