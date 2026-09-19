"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import OwnerProtectedRoute from "@/components/OwnerProtectedRoute";

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

function AnalyticsContent() {
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] =
    useState<Profile[]>([]);

  const [subscriptions, setSubscriptions] =
    useState<Subscription[]>([]);

  const [error, setError] =
    useState("");


  useEffect(() => {
    loadAnalytics();
  }, []);


  // ==============================
  // LOAD ANALYTICS DATA
  // ==============================

  async function loadAnalytics() {
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
      // REMOVE OWNER
      // ==========================

      const normalUsers =
        (profilesData || []).filter(
          (profile) =>
            profile.role !== "owner"
        );


      const ownerIds =
        (profilesData || [])
          .filter(
            (profile) =>
              profile.role === "owner"
          )
          .map(
            (profile) =>
              profile.id
          );


      const normalSubscriptions =
        (subscriptionsData || []).filter(
          (subscription) =>
            !ownerIds.includes(
              subscription.user_id
            )
        );


      setProfiles(
        normalUsers
      );

      setSubscriptions(
        normalSubscriptions
      );


    } catch (error: any) {

      console.error(
        "Analytics load error:",
        error
      );

      setError(
        error.message ||
        "Unable to load analytics."
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
  // CALCULATIONS
  // ==============================


  const totalUsers =
    profiles.length;


  const activeSubscriptions =
    subscriptions.filter(
      (subscription) =>
        subscription.status
          ?.toLowerCase() ===
        "active"
    );


  const activeSubscribers =
    activeSubscriptions.length;


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
    activeSubscriptions.reduce(
      (total, subscription) =>
        total +
        Number(
          subscription.amount || 0
        ),
      0
    );


  // ==============================
  // AVERAGE REVENUE
  // ==============================

  const averageRevenue =
    activeSubscribers > 0
      ? totalRevenue /
        activeSubscribers
      : 0;


  // ==============================
  // PLAN DATA
  // ==============================

  const starterSubscriptions =
    subscriptions.filter(
      (subscription) =>
        subscription.plan
          ?.toLowerCase()
          .includes("starter")
    );


  const professionalSubscriptions =
    subscriptions.filter(
      (subscription) =>
        subscription.plan
          ?.toLowerCase()
          .includes("professional")
    );


  const businessSubscriptions =
    subscriptions.filter(
      (subscription) =>
        subscription.plan
          ?.toLowerCase()
          .includes("business")
    );


  const starterCount =
    starterSubscriptions.length;


  const professionalCount =
    professionalSubscriptions.length;


  const businessCount =
    businessSubscriptions.length;


  // ==============================
  // REVENUE BY PLAN
  // ==============================

  const starterRevenue =
    starterSubscriptions
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


  const professionalRevenue =
    professionalSubscriptions
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


  const businessRevenue =
    businessSubscriptions
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
  // MOST POPULAR PLAN
  // ==============================

  const planData = [
    {
      name: "Starter",
      count: starterCount,
    },
    {
      name: "Professional",
      count: professionalCount,
    },
    {
      name: "Business",
      count: businessCount,
    },
  ];


  const mostPopularPlan =
    planData.reduce(
      (previous, current) =>
        current.count >
        previous.count
          ? current
          : previous,
      planData[0]
    );


  // ==============================
  // LOADING
  // ==============================

  if (loading) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-6xl animate-pulse mb-5">

            📊

          </div>

          <h1 className="text-2xl font-bold">

            Loading Analytics...

          </h1>

          <p className="text-slate-400 mt-3">

            Calculating BizAI platform data

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

            Analytics Error

          </h1>

          <p className="text-slate-400 mt-3">

            {error}

          </p>

          <button
            onClick={loadAnalytics}
            className="mt-6 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-semibold"
          >

            🔄 Try Again

          </button>

        </div>

      </main>

    );

  }


  // ==============================
  // MAIN PAGE
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

              📊 Platform Analytics

            </h1>

            <p className="text-slate-400 mt-3">

              Complete performance insights for your BizAI platform.

            </p>

          </div>


          <button
            onClick={loadAnalytics}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-xl font-semibold transition"
          >

            🔄 Refresh Analytics

          </button>

        </div>


        {/* MAIN STATS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">


          {/* USERS */}

          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              👥 Total Users

            </p>

            <h2 className="text-4xl font-bold text-blue-400 mt-4">

              {totalUsers}

            </h2>

          </div>


          {/* ACTIVE */}

          <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              🟢 Active Subscribers

            </p>

            <h2 className="text-4xl font-bold text-green-400 mt-4">

              {activeSubscribers}

            </h2>

          </div>


          {/* REVENUE */}

          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              💰 Total Revenue

            </p>

            <h2 className="text-3xl font-bold text-purple-400 mt-4">

              {formatMoney(totalRevenue)}

            </h2>

          </div>


          {/* AVERAGE */}

          <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              📈 Average Revenue

            </p>

            <h2 className="text-3xl font-bold text-yellow-400 mt-4">

              {formatMoney(
                Math.round(
                  averageRevenue
                )
              )}

            </h2>

          </div>


        </div>


        {/* PERFORMANCE OVERVIEW */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">


          {/* MOST POPULAR */}

          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              🏆 Most Popular Plan

            </p>

            <h2 className="text-3xl font-bold text-purple-400 mt-4">

              {mostPopularPlan.name}

            </h2>

            <p className="text-slate-500 mt-3">

              {mostPopularPlan.count} subscribers

            </p>

          </div>


          {/* ACTIVE */}

          <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              🟢 Active Plans

            </p>

            <h2 className="text-4xl font-bold text-green-400 mt-4">

              {activeSubscribers}

            </h2>

          </div>


          {/* INACTIVE */}

          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              🔴 Inactive Plans

            </p>

            <h2 className="text-4xl font-bold text-red-400 mt-4">

              {inactiveSubscribers}

            </h2>

          </div>


        </div>


        {/* PLAN DISTRIBUTION */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

          <h2 className="text-2xl font-bold">

            💳 Plan Distribution

          </h2>

          <p className="text-slate-400 text-sm mt-2 mb-6">

            Number of users subscribed to each plan.

          </p>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">


            <div className="bg-slate-950 border border-blue-500/30 rounded-xl p-6">

              <p className="text-blue-400">

                Starter

              </p>

              <h3 className="text-4xl font-bold mt-4">

                {starterCount}

              </h3>

              <p className="text-slate-500 mt-2">

                subscribers

              </p>

            </div>


            <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-6">

              <p className="text-purple-400">

                Professional

              </p>

              <h3 className="text-4xl font-bold mt-4">

                {professionalCount}

              </h3>

              <p className="text-slate-500 mt-2">

                subscribers

              </p>

            </div>


            <div className="bg-slate-950 border border-green-500/30 rounded-xl p-6">

              <p className="text-green-400">

                Business

              </p>

              <h3 className="text-4xl font-bold mt-4">

                {businessCount}

              </h3>

              <p className="text-slate-500 mt-2">

                subscribers

              </p>

            </div>


          </div>

        </div>


        {/* REVENUE BY PLAN */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

          <h2 className="text-2xl font-bold">

            💰 Revenue by Plan

          </h2>

          <p className="text-slate-400 text-sm mt-2 mb-6">

            Revenue generated from active subscriptions.

          </p>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">


            <div className="bg-slate-950 border border-blue-500/30 rounded-xl p-6">

              <p className="text-blue-400">

                Starter Revenue

              </p>

              <h3 className="text-3xl font-bold text-white mt-4">

                {formatMoney(
                  starterRevenue
                )}

              </h3>

            </div>


            <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-6">

              <p className="text-purple-400">

                Professional Revenue

              </p>

              <h3 className="text-3xl font-bold text-white mt-4">

                {formatMoney(
                  professionalRevenue
                )}

              </h3>

            </div>


            <div className="bg-slate-950 border border-green-500/30 rounded-xl p-6">

              <p className="text-green-400">

                Business Revenue

              </p>

              <h3 className="text-3xl font-bold text-white mt-4">

                {formatMoney(
                  businessRevenue
                )}

              </h3>

            </div>


          </div>

        </div>


        {/* PLATFORM SUMMARY */}

        <div className="bg-gradient-to-r from-purple-900/40 to-slate-900 border border-purple-500/30 rounded-2xl p-8 mb-8">

          <h2 className="text-2xl font-bold">

            🚀 Platform Summary

          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">


            <div>

              <p className="text-slate-400">

                Total Platform Users

              </p>

              <p className="text-3xl font-bold text-blue-400 mt-2">

                {totalUsers}

              </p>

            </div>


            <div>

              <p className="text-slate-400">

                Active Subscribers

              </p>

              <p className="text-3xl font-bold text-green-400 mt-2">

                {activeSubscribers}

              </p>

            </div>


            <div>

              <p className="text-slate-400">

                Total Revenue

              </p>

              <p className="text-3xl font-bold text-purple-400 mt-2">

                {formatMoney(
                  totalRevenue
                )}

              </p>

            </div>


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
// PROTECTED PAGE
// ==============================

export default function AnalyticsPage() {

  return (

    <OwnerProtectedRoute>

      <AnalyticsContent />

    </OwnerProtectedRoute>

  );

}