"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import OwnerProtectedRoute from "@/components/OwnerProtectedRoute";
import Link from "next/link";

type UserProfile = {
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

type UserWithSubscription = UserProfile & {
  subscription: Subscription | null;
};

function UsersContent() {
  const [loading, setLoading] = useState(true);

  const [users, setUsers] =
    useState<UserWithSubscription[]>([]);

  const [search, setSearch] =
    useState("");

  const [error, setError] =
    useState("");


  // ==============================
  // LOAD USERS
  // ==============================

  useEffect(() => {
    loadUsers();
  }, []);


  async function loadUsers() {
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

      const profiles =
        (profilesData || []).filter(
          (user) =>
            user.role?.toLowerCase() !==
            "owner"
        );


      const subscriptions =
        subscriptionsData || [];


      // ==========================
      // COMBINE USER + SUBSCRIPTION
      // ==========================

      const combinedUsers =
        profiles.map((user) => {

          const userSubscription =
            subscriptions.find(
              (subscription) =>
                subscription.user_id ===
                user.id
            ) || null;


          return {

            ...user,

            subscription:
              userSubscription,

          };

        });


      setUsers(combinedUsers);


    } catch (error: any) {

      console.error(
        "Load users error:",
        error
      );

      setError(
        error.message ||
        "Unable to load users."
      );

    } finally {

      setLoading(false);

    }

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
  // FILTER USERS
  // ==============================

  const filteredUsers =
    users.filter((user) => {

      const searchText =
        search.toLowerCase();


      return (

        (user.full_name || "")
          .toLowerCase()
          .includes(searchText) ||

        (user.email || "")
          .toLowerCase()
          .includes(searchText) ||

        (user.role || "")
          .toLowerCase()
          .includes(searchText) ||

        (user.subscription?.plan || "")
          .toLowerCase()
          .includes(searchText) ||

        (user.subscription?.status || "")
          .toLowerCase()
          .includes(searchText)

      );

    });


  // ==============================
  // LOADING
  // ==============================

  if (loading) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-6xl animate-pulse mb-5">

            👥

          </div>

          <h1 className="text-2xl font-bold">

            Loading BizAI Users...

          </h1>

          <p className="text-slate-400 mt-3">

            Fetching platform users

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

            Unable to Load Users

          </h1>

          <p className="text-slate-400 mt-3">

            {error}

          </p>

          <button
            onClick={loadUsers}
            className="mt-6 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-semibold transition"
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


        {/* ========================== */}
        {/* HEADER */}
        {/* ========================== */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-10">

          <div>

            <p className="text-purple-400 font-semibold text-sm">

              BIZAI OWNER PANEL

            </p>

            <h1 className="text-3xl md:text-5xl font-bold mt-2">

              👥 All BizAI Users

            </h1>

            <p className="text-slate-400 mt-3">

              Monitor all registered BizAI users.

            </p>

          </div>


          <button
            onClick={loadUsers}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-xl font-semibold transition"
          >

            🔄 Refresh Users

          </button>

        </div>


        {/* ========================== */}
        {/* USER STATISTICS */}
        {/* ========================== */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">


          {/* TOTAL USERS */}

          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              👥 Total Users

            </p>

            <h2 className="text-4xl font-bold text-blue-400 mt-4">

              {users.length}

            </h2>

          </div>


          {/* ACTIVE SUBSCRIBERS */}

          <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              🟢 Active Subscribers

            </p>

            <h2 className="text-4xl font-bold text-green-400 mt-4">

              {
                users.filter(
                  (user) =>
                    user.subscription?.status
                      ?.toLowerCase() ===
                    "active"
                ).length
              }

            </h2>

          </div>


          {/* NO SUBSCRIPTION */}

          <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl p-6">

            <p className="text-slate-400">

              ⚠️ No Subscription

            </p>

            <h2 className="text-4xl font-bold text-yellow-400 mt-4">

              {
                users.filter(
                  (user) =>
                    !user.subscription
                ).length
              }

            </h2>

          </div>

        </div>


        {/* ========================== */}
        {/* SEARCH */}
        {/* ========================== */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="🔍 Search by name, email, role, plan or status..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-purple-500 transition"
          />

        </div>


        {/* ========================== */}
        {/* USERS TABLE */}
        {/* ========================== */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">


          {/* TABLE HEADER */}

          <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            <div>

              <h2 className="text-2xl font-bold">

                👥 Registered Users

              </h2>

              <p className="text-slate-400 text-sm mt-1">

                Showing {filteredUsers.length} users

              </p>

            </div>


            <div className="bg-purple-500/20 text-purple-400 px-4 py-2 rounded-full text-sm w-fit">

              {users.length} Total

            </div>

          </div>


          {/* NO USERS */}

          {filteredUsers.length === 0 ? (

            <div className="text-center py-16 text-slate-500">

              <div className="text-6xl mb-5">

                👥

              </div>

              <h3 className="text-xl text-white font-semibold">

                No Users Found

              </h3>

              <p className="mt-2">

                No users match your search.

              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-left min-w-[1100px]">


                {/* TABLE HEAD */}

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

                      Plan

                    </th>

                    <th className="p-5">

                      Amount

                    </th>

                    <th className="p-5">

                      Status

                    </th>

                    <th className="p-5">

                      Joined

                    </th>

                    <th className="p-5 text-right">

                      Action

                    </th>

                  </tr>

                </thead>


                {/* TABLE BODY */}

                <tbody>

                  {filteredUsers.map(
                    (user) => (

                      <tr
                        key={user.id}
                        className="border-b border-slate-800/70 hover:bg-slate-800/40 transition"
                      >


                        {/* USER */}

                        <td className="p-5">

                          <div className="flex items-center gap-3">

                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">

                              👤

                            </div>

                            <div>

                              <p className="font-semibold text-white">

                                {user.full_name ||
                                  "BizAI User"}

                              </p>

                              <p className="text-xs text-slate-500 mt-1">

                                ID: {user.id.slice(0, 8)}...

                              </p>

                            </div>

                          </div>

                        </td>


                        {/* EMAIL */}

                        <td className="p-5 text-blue-400">

                          {user.email ||
                            "Not available"}

                        </td>


                        {/* ROLE */}

                        <td className="p-5">

                          <span className="px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400">

                            👤 {user.role || "user"}

                          </span>

                        </td>


                        {/* PLAN */}

                        <td className="p-5 font-semibold">

                          {user.subscription?.plan || (

                            <span className="text-slate-500">

                              No Plan

                            </span>

                          )}

                        </td>


                        {/* AMOUNT */}

                        <td className="p-5 text-green-400 font-semibold">

                          {user.subscription

                            ? formatMoney(
                                user.subscription.amount
                              )

                            : "—"}

                        </td>


                        {/* STATUS */}

                        <td className="p-5">

                          {user.subscription ? (

                            <span
                              className={`px-3 py-1 rounded-full text-sm ${
                                user.subscription.status
                                  ?.toLowerCase() ===
                                "active"

                                  ? "bg-green-500/20 text-green-400"

                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >

                              {
                                user.subscription.status
                              }

                            </span>

                          ) : (

                            <span className="text-slate-500">

                              Not Subscribed

                            </span>

                          )}

                        </td>


                        {/* JOINED */}

                        <td className="p-5 text-slate-400">

                          {formatDate(
                            user.created_at
                          )}

                        </td>


                        {/* ACTION */}

                        <td className="p-5 text-right">

                          <Link
                            href={`/owner/users/${user.id}`}
                            className="inline-flex bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
                          >

                            🔍 View Details

                          </Link>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* ========================== */}
        {/* FOOTER */}
        {/* ========================== */}

        <div className="text-center mt-10 text-slate-600 text-sm">

          👑 BizAI Owner Panel • User Management System

        </div>


      </div>

    </main>

  );

}


// ==============================
// PROTECTED PAGE
// ==============================

export default function UsersPage() {

  return (

    <OwnerProtectedRoute>

      <UsersContent />

    </OwnerProtectedRoute>

  );

}