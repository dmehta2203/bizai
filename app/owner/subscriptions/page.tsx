"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import OwnerProtectedRoute from "@/components/OwnerProtectedRoute";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

type Subscription = {
  id: string;
  user_id: string;
  plan: string | null;
  status: string | null;
  amount: number | null;
  billing_cycle: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string | null;
};

type SubscriptionWithUser = Subscription & {
  user: Profile | null;
};

function SubscriptionsContent() {
  const [loading, setLoading] = useState(true);

  const [subscriptions, setSubscriptions] = useState<
    SubscriptionWithUser[]
  >([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [error, setError] = useState("");

  useEffect(() => {
    loadSubscriptions();
  }, []);

  // ==============================
  // LOAD SUBSCRIPTIONS
  // ==============================

  async function loadSubscriptions() {
    try {
      setLoading(true);
      setError("");

      // LOAD PROFILES

      const {
        data: profilesData,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role
        `);

      if (profilesError) {
        throw profilesError;
      }

      // LOAD SUBSCRIPTIONS

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
          current_period_start,
          current_period_end,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        });

      if (subscriptionsError) {
        throw subscriptionsError;
      }

      const profiles = profilesData || [];
      const subscriptionList =
        subscriptionsData || [];

      // COMBINE USER + SUBSCRIPTION

      const combinedSubscriptions =
        subscriptionList.map(
          (subscription) => {

            const user =
              profiles.find(
                (profile) =>
                  profile.id ===
                  subscription.user_id
              ) || null;

            return {
              ...subscription,
              user,
            };
          }
        );

      setSubscriptions(
        combinedSubscriptions
      );

    } catch (error: any) {

      console.error(
        "Subscription load error:",
        error
      );

      setError(
        error.message ||
        "Unable to load subscriptions."
      );

    } finally {

      setLoading(false);

    }
  }

  // ==============================
  // FORMAT MONEY
  // ==============================

  function formatMoney(
    amount: number | null
  ) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }
    ).format(
      Number(amount || 0)
    );
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
  // REMOVE OWNER SUBSCRIPTIONS
  // ==============================

  const userSubscriptions =
    subscriptions.filter(
      (subscription) =>
        subscription.user?.role !==
        "owner"
    );

  // ==============================
  // FILTER SUBSCRIPTIONS
  // ==============================

  const filteredSubscriptions =
    userSubscriptions.filter(
      (subscription) => {

        const searchText =
          search.toLowerCase();

        const matchesSearch =
          subscription.user?.full_name
            ?.toLowerCase()
            .includes(searchText) ||

          subscription.user?.email
            ?.toLowerCase()
            .includes(searchText) ||

          subscription.plan
            ?.toLowerCase()
            .includes(searchText) ||

          subscription.status
            ?.toLowerCase()
            .includes(searchText);

        const matchesStatus =
          statusFilter === "all" ||
          subscription.status
            ?.toLowerCase() ===
            statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );

  // ==============================
  // STATISTICS
  // ==============================

  const totalSubscriptions =
    userSubscriptions.length;

  const activeSubscriptions =
    userSubscriptions.filter(
      (subscription) =>
        subscription.status
          ?.toLowerCase() ===
        "active"
    ).length;

  const inactiveSubscriptions =
    userSubscriptions.filter(
      (subscription) =>
        subscription.status
          ?.toLowerCase() !==
        "active"
    ).length;

  const totalRevenue =
    userSubscriptions
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
  // LOADING
  // ==============================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-6xl animate-pulse mb-5">
            💳
          </div>

          <h1 className="text-2xl font-bold">
            Loading Subscriptions...
          </h1>

          <p className="text-slate-400 mt-3">
            Fetching subscription data
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
            Unable to Load Subscriptions
          </h1>

          <p className="text-slate-400 mt-3">
            {error}
          </p>

          <button
            onClick={loadSubscriptions}
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
              💳 Subscriptions
            </h1>

            <p className="text-slate-400 mt-3">
              Manage and monitor all BizAI user subscriptions.
            </p>

          </div>

          <button
            onClick={loadSubscriptions}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-xl font-semibold"
          >
            🔄 Refresh
          </button>

        </div>

        {/* STATISTICS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              💳 Total Subscriptions
            </p>

            <h2 className="text-4xl font-bold text-blue-400 mt-4">
              {totalSubscriptions}
            </h2>

          </div>

          <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              🟢 Active
            </p>

            <h2 className="text-4xl font-bold text-green-400 mt-4">
              {activeSubscriptions}
            </h2>

          </div>

          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              🔴 Inactive
            </p>

            <h2 className="text-4xl font-bold text-red-400 mt-4">
              {inactiveSubscriptions}
            </h2>

          </div>

          <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              💰 Active Revenue
            </p>

            <h2 className="text-3xl font-bold text-yellow-400 mt-4">
              {formatMoney(totalRevenue)}
            </h2>

          </div>

        </div>

        {/* SEARCH AND FILTER */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="🔍 Search by user, email, plan or status..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-purple-500"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-purple-500"
            >

              <option value="all">
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>

              <option value="cancelled">
                Cancelled
              </option>

            </select>

          </div>

        </div>

        {/* SUBSCRIPTIONS TABLE */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

          <div className="p-6 border-b border-slate-800">

            <h2 className="text-2xl font-bold">
              💳 All Subscriptions
            </h2>

            <p className="text-slate-400 text-sm mt-2">
              Showing {filteredSubscriptions.length} subscriptions
            </p>

          </div>

          {filteredSubscriptions.length === 0 ? (

            <div className="text-center py-16 text-slate-500">

              <div className="text-6xl mb-5">
                💳
              </div>

              <h3 className="text-xl text-white font-semibold">
                No Subscriptions Found
              </h3>

              <p className="mt-2">
                No subscriptions match your search.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-left min-w-[1100px]">

                <thead>

                  <tr className="border-b border-slate-800 text-slate-400 text-sm">

                    <th className="p-5">
                      User
                    </th>

                    <th className="p-5">
                      Plan
                    </th>

                    <th className="p-5">
                      Amount
                    </th>

                    <th className="p-5">
                      Status
                    </th>

                    <th className="p-5">
                      Billing
                    </th>

                    <th className="p-5">
                      Started
                    </th>

                    <th className="p-5">
                      Ends
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredSubscriptions.map(
                    (subscription) => (

                      <tr
                        key={subscription.id}
                        className="border-b border-slate-800/70 hover:bg-slate-800/40 transition"
                      >

                        {/* USER */}

                        <td className="p-5">

                          <div>

                            <p className="font-semibold">
                              {subscription.user?.full_name ||
                                "BizAI User"}
                            </p>

                            <p className="text-sm text-blue-400 mt-1">
                              {subscription.user?.email ||
                                "Email not available"}
                            </p>

                          </div>

                        </td>

                        {/* PLAN */}

                        <td className="p-5">

                          <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm">

                            {subscription.plan ||
                              "No Plan"}

                          </span>

                        </td>

                        {/* AMOUNT */}

                        <td className="p-5 text-green-400 font-semibold">

                          {formatMoney(
                            subscription.amount
                          )}

                        </td>

                        {/* STATUS */}

                        <td className="p-5">

                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
                              subscription.status
                                ?.toLowerCase() ===
                              "active"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >

                            {subscription.status ||
                              "Unknown"}

                          </span>

                        </td>

                        {/* BILLING */}

                        <td className="p-5 text-slate-300">

                          {subscription.billing_cycle ||
                            "Monthly"}

                        </td>

                        {/* START */}

                        <td className="p-5 text-slate-400">

                          {formatDate(
                            subscription.current_period_start ||
                            subscription.created_at
                          )}

                        </td>

                        {/* END */}

                        <td className="p-5 text-slate-400">

                          {formatDate(
                            subscription.current_period_end
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

        {/* FOOTER */}

        <div className="text-center mt-10 text-slate-600 text-sm">

          👑 BizAI Owner Panel • Subscription Management

        </div>

      </div>

    </main>
  );
}


// ==============================
// PROTECTED PAGE
// ==============================

export default function SubscriptionsPage() {

  return (

    <OwnerProtectedRoute>

      <SubscriptionsContent />

    </OwnerProtectedRoute>

  );
}