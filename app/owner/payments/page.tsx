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
  created_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
};

type PaymentWithUser = Subscription & {
  user: Profile | null;
};

function PaymentsContent() {
  const [loading, setLoading] = useState(true);

  const [payments, setPayments] = useState<
    PaymentWithUser[]
  >([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [error, setError] = useState("");

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    try {
      setLoading(true);
      setError("");

      // LOAD SUBSCRIPTIONS FIRST

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
          created_at,
          current_period_start,
          current_period_end
        `)
        .order("created_at", {
          ascending: false,
        });

      if (subscriptionsError) {
        throw subscriptionsError;
      }

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

      const subscriptions =
        subscriptionsData || [];

      const profiles =
        profilesData || [];

      console.log(
        "SUBSCRIPTIONS:",
        subscriptions
      );

      console.log(
        "PROFILES:",
        profiles
      );

      // FIND OWNER IDs

      const ownerIds = profiles
        .filter(
          (profile) =>
            profile.role?.toLowerCase() ===
            "owner"
        )
        .map(
          (profile) => profile.id
        );

      console.log(
        "OWNER IDS:",
        ownerIds
      );

      // REMOVE OWNER ONLY

      const customerSubscriptions =
        subscriptions.filter(
          (subscription) =>
            !ownerIds.includes(
              subscription.user_id
            )
        );

      console.log(
        "CUSTOMER SUBSCRIPTIONS:",
        customerSubscriptions
      );

      // COMBINE WITH PROFILE

      const combinedPayments =
        customerSubscriptions.map(
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

      setPayments(
        combinedPayments
      );

    } catch (error: any) {

      console.error(
        "PAYMENT ERROR:",
        error
      );

      setError(
        error.message ||
          "Unable to load payments."
      );

    } finally {

      setLoading(false);

    }
  }

  // FORMAT MONEY

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

  // FORMAT DATE

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

  // FILTER

  const filteredPayments =
    payments.filter((payment) => {

      const searchText =
        search.toLowerCase();

      const matchesSearch =

        (payment.user?.full_name || "")
          .toLowerCase()
          .includes(searchText) ||

        (payment.user?.email || "")
          .toLowerCase()
          .includes(searchText) ||

        payment.user_id
          .toLowerCase()
          .includes(searchText) ||

        (payment.plan || "")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =

        statusFilter === "all" ||

        payment.status
          ?.toLowerCase() ===
          statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  // STATISTICS

  const totalPayments =
    payments.length;

  const activePayments =
    payments.filter(
      (payment) =>
        payment.status
          ?.toLowerCase() ===
        "active"
    );

  const activePaymentCount =
    activePayments.length;

  const totalRevenue =
    activePayments.reduce(
      (total, payment) =>
        total +
        Number(payment.amount || 0),
      0
    );

  const inactivePayments =
    payments.filter(
      (payment) =>
        payment.status
          ?.toLowerCase() !==
        "active"
    ).length;

  // STATUS STYLE

  function getStatusStyle(
    status: string | null
  ) {

    if (
      status?.toLowerCase() ===
      "active"
    ) {
      return "bg-green-500/20 text-green-400";
    }

    if (
      status?.toLowerCase() ===
      "pending"
    ) {
      return "bg-yellow-500/20 text-yellow-400";
    }

    if (
      status?.toLowerCase() ===
      "cancelled"
    ) {
      return "bg-red-500/20 text-red-400";
    }

    return "bg-slate-500/20 text-slate-400";
  }

  // LOADING

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-6xl animate-pulse mb-5">
            💰
          </div>

          <h1 className="text-2xl font-bold">
            Loading Payments...
          </h1>

        </div>

      </main>
    );
  }

  // ERROR

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center">

          <div className="text-5xl">
            ⚠️
          </div>

          <h1 className="text-2xl font-bold mt-5">
            Unable to Load Payments
          </h1>

          <p className="text-slate-400 mt-3">
            {error}
          </p>

          <button
            onClick={loadPayments}
            className="mt-6 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-semibold"
          >
            🔄 Try Again
          </button>

        </div>

      </main>
    );
  }

  // MAIN PAGE

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
              💰 Payments
            </h1>

            <p className="text-slate-400 mt-3">
              Monitor all customer subscription payments.
            </p>

          </div>

          <button
            onClick={loadPayments}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-xl font-semibold"
          >
            🔄 Refresh Payments
          </button>

        </div>

        {/* STATISTICS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              💳 Total Payments
            </p>

            <h2 className="text-4xl font-bold text-blue-400 mt-4">
              {totalPayments}
            </h2>

          </div>

          <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              🟢 Active
            </p>

            <h2 className="text-4xl font-bold text-green-400 mt-4">
              {activePaymentCount}
            </h2>

          </div>

          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              🔴 Inactive
            </p>

            <h2 className="text-4xl font-bold text-red-400 mt-4">
              {inactivePayments}
            </h2>

          </div>

          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              💰 Revenue
            </p>

            <h2 className="text-3xl font-bold text-purple-400 mt-4">
              {formatMoney(totalRevenue)}
            </h2>

          </div>

        </div>

        {/* SEARCH */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="🔍 Search payments..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-purple-500"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none"
            >

              <option value="all">
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="pending">
                Pending
              </option>

            </select>

          </div>

        </div>

        {/* PAYMENT HISTORY */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

          <div className="p-6 border-b border-slate-800">

            <h2 className="text-2xl font-bold">
              💰 Customer Payment History
            </h2>

            <p className="text-slate-400 text-sm mt-2">
              Showing {filteredPayments.length} records
            </p>

          </div>

          {filteredPayments.length === 0 ? (

            <div className="text-center py-16">

              <div className="text-6xl mb-5">
                💰
              </div>

              <h3 className="text-xl font-bold">
                No Payment History
              </h3>

              <p className="text-slate-500 mt-2">
                No customer payments found.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-left min-w-[1100px]">

                <thead>

                  <tr className="border-b border-slate-800 text-slate-400">

                    <th className="p-5">
                      Customer
                    </th>

                    <th className="p-5">
                      Email
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

                  </tr>

                </thead>

                <tbody>

                  {filteredPayments.map(
                    (payment) => (

                      <tr
                        key={payment.id}
                        className="border-b border-slate-800 hover:bg-slate-800/40"
                      >

                        <td className="p-5 font-semibold">

                          {payment.user?.full_name ||
                            "BizAI Customer"}

                        </td>

                        <td className="p-5 text-blue-400">

                          {payment.user?.email ||
                            "Email unavailable"}

                        </td>

                        <td className="p-5">

                          <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full">

                            {payment.plan}

                          </span>

                        </td>

                        <td className="p-5 text-green-400 font-semibold">

                          {formatMoney(
                            payment.amount
                          )}

                        </td>

                        <td className="p-5">

                          <span
                            className={`px-3 py-1 rounded-full ${getStatusStyle(
                              payment.status
                            )}`}
                          >

                            {payment.status}

                          </span>

                        </td>

                        <td className="p-5 text-slate-400">

                          {payment.billing_cycle ||
                            "N/A"}

                        </td>

                        <td className="p-5 text-slate-400">

                          {formatDate(
                            payment.current_period_start ||
                            payment.created_at
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

      </div>

    </main>
  );
}


// PROTECTED PAGE

export default function PaymentsPage() {
  return (
    <OwnerProtectedRoute>
      <PaymentsContent />
    </OwnerProtectedRoute>
  );
}