"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import OwnerProtectedRoute from "@/components/OwnerProtectedRoute";
import { useParams, useRouter } from "next/navigation";

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
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string | null;
};

type UserDetails = {
  profile: UserProfile | null;
  subscription: Subscription | null;
};

function UserDetailsContent() {
  const params = useParams();
  const router = useRouter();

  const userId = params.id as string;

  const [loading, setLoading] = useState(true);

  const [details, setDetails] = useState<UserDetails>({
    profile: null,
    subscription: null,
  });

  const [error, setError] = useState("");

  const [customerCount, setCustomerCount] = useState(0);

  const [leadCount, setLeadCount] = useState(0);

  const [taskCount, setTaskCount] = useState(0);

  const [appointmentCount, setAppointmentCount] = useState(0);

  const [salesCount, setSalesCount] = useState(0);


  useEffect(() => {
    if (userId) {
      loadUserDetails();
    }
  }, [userId]);


  // ==============================
  // LOAD USER DETAILS
  // ==============================

  async function loadUserDetails() {

    try {

      setLoading(true);
      setError("");


      // ==========================
      // LOAD PROFILE
      // ==========================

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role,
          created_at
        `)
        .eq(
          "id",
          userId
        )
        .maybeSingle();


      if (profileError) {
        throw profileError;
      }


      if (!profileData) {

        setError(
          "User profile not found."
        );

        return;

      }


      // ==========================
      // LOAD SUBSCRIPTION
      // ==========================

      const {
        data: subscriptionData,
        error: subscriptionError,
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
        .eq(
          "user_id",
          userId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();


      if (subscriptionError) {

        console.error(
          "Subscription error:",
          subscriptionError
        );

      }


      // ==========================
      // LOAD CUSTOMER COUNT
      // ==========================

      const {
        count: customers,
      } = await supabase
        .from("customers")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "user_id",
          userId
        );


      setCustomerCount(
        customers || 0
      );


      // ==========================
      // LOAD LEAD COUNT
      // ==========================

      const {
        count: leads,
      } = await supabase
        .from("leads")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "user_id",
          userId
        );


      setLeadCount(
        leads || 0
      );


      // ==========================
      // LOAD TASK COUNT
      // ==========================

      const {
        count: tasks,
      } = await supabase
        .from("tasks")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "user_id",
          userId
        );


      setTaskCount(
        tasks || 0
      );


      // ==========================
      // LOAD APPOINTMENT COUNT
      // ==========================

      const {
        count: appointments,
      } = await supabase
        .from("appointments")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "user_id",
          userId
        );


      setAppointmentCount(
        appointments || 0
      );


      // ==========================
      // LOAD SALES COUNT
      // ==========================

      const {
        count: sales,
      } = await supabase
        .from("sales")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "user_id",
          userId
        );


      setSalesCount(
        sales || 0
      );


      // ==========================
      // SAVE USER DETAILS
      // ==========================

      setDetails({

        profile:
          profileData,

        subscription:
          subscriptionData || null,

      });


    } catch (error: any) {

      console.error(
        "Load user details error:",
        error
      );

      setError(
        error.message ||
        "Unable to load user details."
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
        month: "long",
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
  // GET USER DISPLAY NAME
  // ==============================

  function getUserName() {

    if (details.profile?.full_name) {
      return details.profile.full_name;
    }

    return "BizAI User";

  }


  // ==============================
  // LOADING
  // ==============================

  if (loading) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-6xl animate-pulse mb-5">

            👤

          </div>

          <h1 className="text-2xl font-bold">

            Loading User Details...

          </h1>

          <p className="text-slate-400 mt-3">

            Fetching business activity

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

            Unable to Load User

          </h1>

          <p className="text-slate-400 mt-3">

            {error}

          </p>

          <button
            onClick={() =>
              router.push("/owner/users")
            }
            className="mt-6 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-semibold"
          >

            ← Back to Users

          </button>

        </div>

      </main>

    );

  }


  const profile = details.profile;

  const subscription = details.subscription;


  // ==============================
  // MAIN PAGE
  // ==============================

  return (

    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">


        {/* ========================== */}
        {/* HEADER */}
        {/* ========================== */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

          <div>

            <button
              onClick={() =>
                router.push("/owner/users")
              }
              className="text-purple-400 hover:text-purple-300 transition mb-4"
            >

              ← Back to All Users

            </button>

            <p className="text-purple-400 font-semibold text-sm">

              USER MANAGEMENT

            </p>

            <h1 className="text-3xl md:text-5xl font-bold mt-2">

              👤 User Details

            </h1>

            <p className="text-slate-400 mt-3">

              Complete overview of this BizAI user.

            </p>

          </div>


          <button
            onClick={loadUserDetails}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-xl font-semibold"
          >

            🔄 Refresh

          </button>

        </div>


        {/* ========================== */}
        {/* USER PROFILE */}
        {/* ========================== */}

        <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 md:p-8 mb-8">

          <div className="flex flex-col md:flex-row md:items-center gap-6">


            {/* USER ICON */}

            <div className="w-24 h-24 rounded-full bg-purple-600 flex items-center justify-center text-5xl">

              👤

            </div>


            <div className="flex-1">


              <p className="text-purple-400 text-sm font-semibold">

                BIZAI USER

              </p>


              {/* USER NAME */}

              <h2 className="text-3xl md:text-4xl font-bold mt-2">

                {getUserName()}

              </h2>


              {/* EMAIL */}

              {profile?.email && (

                <p className="text-slate-400 mt-2">

                  📧 {profile.email}

                </p>

              )}


              <div className="flex flex-wrap gap-3 mt-4">


                {/* ROLE */}

                <span
                  className={`px-4 py-2 rounded-full text-sm ${
                    profile?.role === "owner"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >

                  👑 {profile?.role || "user"}

                </span>


                {/* JOIN DATE */}

                <span className="bg-slate-800 text-slate-300 px-4 py-2 rounded-full text-sm">

                  📅 Joined{" "}

                  {formatDate(
                    profile?.created_at || null
                  )}

                </span>


              </div>

            </div>

          </div>

        </div>


        {/* ========================== */}
        {/* SUBSCRIPTION */}
        {/* ========================== */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

          <h2 className="text-2xl font-bold mb-6">

            💳 Subscription Details

          </h2>


          {subscription ? (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">


              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">

                <p className="text-slate-400 text-sm">

                  Plan

                </p>

                <p className="text-xl font-bold mt-3 text-purple-400">

                  {subscription.plan}

                </p>

              </div>


              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">

                <p className="text-slate-400 text-sm">

                  Amount Paid

                </p>

                <p className="text-xl font-bold mt-3 text-green-400">

                  {formatMoney(
                    subscription.amount
                  )}

                </p>

              </div>


              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">

                <p className="text-slate-400 text-sm">

                  Status

                </p>

                <p
                  className={`text-xl font-bold mt-3 ${
                    subscription.status
                      ?.toLowerCase() ===
                    "active"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >

                  {subscription.status}

                </p>

              </div>


              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">

                <p className="text-slate-400 text-sm">

                  Billing Cycle

                </p>

                <p className="text-xl font-bold mt-3">

                  {subscription.billing_cycle ||
                    "Monthly"}

                </p>

              </div>

            </div>

          ) : (

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-500">

              <div className="text-5xl mb-4">

                💳

              </div>

              This user does not have a subscription.

            </div>

          )}

        </div>


        {/* ========================== */}
        {/* BUSINESS ACTIVITY */}
        {/* ========================== */}

        <div className="mb-8">

          <h2 className="text-2xl font-bold mb-6">

            📊 Business Activity

          </h2>


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">


            <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6">

              <p className="text-slate-400 text-sm">

                👥 Customers

              </p>

              <p className="text-4xl font-bold text-blue-400 mt-4">

                {customerCount}

              </p>

            </div>


            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6">

              <p className="text-slate-400 text-sm">

                🎯 Leads

              </p>

              <p className="text-4xl font-bold text-purple-400 mt-4">

                {leadCount}

              </p>

            </div>


            <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl p-6">

              <p className="text-slate-400 text-sm">

                📋 Tasks

              </p>

              <p className="text-4xl font-bold text-yellow-400 mt-4">

                {taskCount}

              </p>

            </div>


            <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6">

              <p className="text-slate-400 text-sm">

                📅 Appointments

              </p>

              <p className="text-4xl font-bold text-green-400 mt-4">

                {appointmentCount}

              </p>

            </div>


            <div className="bg-slate-900 border border-pink-500/30 rounded-2xl p-6">

              <p className="text-slate-400 text-sm">

                💰 Sales

              </p>

              <p className="text-4xl font-bold text-pink-400 mt-4">

                {salesCount}

              </p>

            </div>

          </div>

        </div>


        {/* ========================== */}
        {/* ACCOUNT INFORMATION */}
        {/* ========================== */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

          <h2 className="text-xl font-bold">

            🔐 Account Information

          </h2>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">


            {/* FULL NAME */}

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">

              <p className="text-slate-500 text-sm">

                Full Name

              </p>

              <p className="text-purple-400 mt-2 font-semibold">

                {profile?.full_name ||
                  "Not available"}

              </p>

            </div>


            {/* EMAIL */}

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">

              <p className="text-slate-500 text-sm">

                Email

              </p>

              <p className="text-blue-400 mt-2 break-all">

                {profile?.email ||
                  "Not available"}

              </p>

            </div>


          </div>


          {/* USER ID */}

          <div className="mt-5 bg-slate-950 border border-slate-800 rounded-xl p-5">

            <p className="text-slate-500 text-sm">

              User ID

            </p>

            <p className="font-mono text-blue-400 mt-2 break-all text-sm">

              {profile?.id}

            </p>

          </div>

        </div>


        {/* ========================== */}
        {/* FOOTER */}
        {/* ========================== */}

        <div className="text-center mt-10 text-slate-600 text-sm">

          👑 BizAI Owner Panel • User Details

        </div>


      </div>

    </main>

  );

}


// ==============================
// OWNER PROTECTED PAGE
// ==============================

export default function UserDetailsPage() {

  return (

    <OwnerProtectedRoute>

      <UserDetailsContent />

    </OwnerProtectedRoute>

  );

}