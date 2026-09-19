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

type PaymentReceipt = {
  id: string;
  user_id: string;
  receipt_number: string;
  plan: string;
  amount: number;
  payment_id: string;
  order_id: string;
  payment_status: string;
  billing_cycle: string | null;
  payment_date: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  created_at: string | null;
};

type ReceiptWithUser = PaymentReceipt & {
  user: Profile | null;
};

function PaymentReceiptsContent() {
  const [loading, setLoading] = useState(true);

  const [receipts, setReceipts] = useState<
    ReceiptWithUser[]
  >([]);

  const [search, setSearch] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    loadReceipts();
  }, []);

  // ==============================
  // LOAD RECEIPTS
  // ==============================

  async function loadReceipts() {
    try {
      setLoading(true);
      setError("");

      // LOAD PAYMENT RECEIPTS

      const {
        data: receiptsData,
        error: receiptsError,
      } = await supabase
        .from("payment_receipts")
        .select(`
          id,
          user_id,
          receipt_number,
          plan,
          amount,
          payment_id,
          order_id,
          payment_status,
          billing_cycle,
          payment_date,
          subscription_start,
          subscription_end,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        });

      if (receiptsError) {
        throw receiptsError;
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

      const receiptsList =
        receiptsData || [];

      const profiles =
        profilesData || [];

      // FIND OWNER IDS

      const ownerIds = profiles
        .filter(
          (profile) =>
            profile.role?.toLowerCase() ===
            "owner"
        )
        .map(
          (profile) =>
            profile.id
        );

      // REMOVE OWNER RECEIPTS

      const customerReceipts =
        receiptsList.filter(
          (receipt) =>
            !ownerIds.includes(
              receipt.user_id
            )
        );

      // COMBINE RECEIPTS WITH USER

      const combinedReceipts =
        customerReceipts.map(
          (receipt) => {

            const user =
              profiles.find(
                (profile) =>
                  profile.id ===
                  receipt.user_id
              ) || null;

            return {
              ...receipt,
              user,
            };
          }
        );

      setReceipts(
        combinedReceipts
      );

    } catch (error: any) {

      console.error(
        "Receipt loading error:",
        error
      );

      setError(
        error.message ||
        "Unable to load payment receipts."
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
        hour: "numeric",
        minute: "numeric",
      }
    ).format(
      new Date(date)
    );
  }

  // ==============================
  // FILTER RECEIPTS
  // ==============================

  const filteredReceipts =
    receipts.filter(
      (receipt) => {

        const searchText =
          search.toLowerCase();

        return (

          receipt.receipt_number
            .toLowerCase()
            .includes(searchText) ||

          receipt.plan
            .toLowerCase()
            .includes(searchText) ||

          receipt.payment_id
            .toLowerCase()
            .includes(searchText) ||

          (receipt.user?.full_name || "")
            .toLowerCase()
            .includes(searchText) ||

          (receipt.user?.email || "")
            .toLowerCase()
            .includes(searchText)

        );
      }
    );

  // ==============================
  // STATISTICS
  // ==============================

  const totalReceipts =
    receipts.length;

  const totalRevenue =
    receipts.reduce(
      (total, receipt) =>
        total +
        Number(receipt.amount || 0),
      0
    );

  const starterCount =
    receipts.filter(
      (receipt) =>
        receipt.plan ===
        "Starter"
    ).length;

  const professionalCount =
    receipts.filter(
      (receipt) =>
        receipt.plan ===
        "Professional"
    ).length;

  const businessCount =
    receipts.filter(
      (receipt) =>
        receipt.plan ===
        "Business"
    ).length;

  // ==============================
  // LOADING
  // ==============================

  if (loading) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-6xl animate-pulse mb-5">
            🧾
          </div>

          <h1 className="text-2xl font-bold">
            Loading Payment Receipts...
          </h1>

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
            Unable to Load Receipts
          </h1>

          <p className="text-slate-400 mt-3">
            {error}
          </p>

          <button
            onClick={loadReceipts}
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
              🧾 Payment Receipts
            </h1>

            <p className="text-slate-400 mt-3">
              View all successful customer payments and receipts.
            </p>

          </div>

          <button
            onClick={loadReceipts}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-xl font-semibold"
          >
            🔄 Refresh
          </button>

        </div>

        {/* STATISTICS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              🧾 Total Receipts
            </p>

            <h2 className="text-4xl font-bold text-blue-400 mt-4">
              {totalReceipts}
            </h2>

          </div>

          <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              💰 Total Revenue
            </p>

            <h2 className="text-3xl font-bold text-green-400 mt-4">
              {formatMoney(totalRevenue)}
            </h2>

          </div>

          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              ⭐ Professional
            </p>

            <h2 className="text-4xl font-bold text-purple-400 mt-4">
              {professionalCount}
            </h2>

          </div>

          <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              💎 Business
            </p>

            <h2 className="text-4xl font-bold text-yellow-400 mt-4">
              {businessCount}
            </h2>

          </div>

        </div>

        {/* SEARCH */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="🔍 Search by customer, email, receipt number, plan or payment ID..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-purple-500"
          />

        </div>

        {/* RECEIPTS TABLE */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

          <div className="p-6 border-b border-slate-800">

            <h2 className="text-2xl font-bold">
              🧾 Receipt History
            </h2>

            <p className="text-slate-400 text-sm mt-2">

              Showing{" "}

              {filteredReceipts.length}

              {" "}receipts

            </p>

          </div>

          {filteredReceipts.length === 0 ? (

            <div className="text-center py-16">

              <div className="text-6xl mb-5">
                🧾
              </div>

              <h3 className="text-xl font-bold">
                No Receipts Found
              </h3>

              <p className="text-slate-500 mt-2">
                Payment receipts will appear here after successful payments.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-left min-w-[1400px]">

                <thead>

                  <tr className="border-b border-slate-800 text-slate-400">

                    <th className="p-5">
                      Receipt
                    </th>

                    <th className="p-5">
                      Customer
                    </th>

                    <th className="p-5">
                      Plan
                    </th>

                    <th className="p-5">
                      Amount
                    </th>

                    <th className="p-5">
                      Payment ID
                    </th>

                    <th className="p-5">
                      Billing
                    </th>

                    <th className="p-5">
                      Payment Date
                    </th>

                    <th className="p-5">
                      Valid Until
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredReceipts.map(
                    (receipt) => (

                      <tr
                        key={receipt.id}
                        className="border-b border-slate-800 hover:bg-slate-800/40"
                      >

                        {/* RECEIPT */}

                        <td className="p-5">

                          <span className="text-blue-400 font-semibold">

                            {receipt.receipt_number}

                          </span>

                        </td>

                        {/* CUSTOMER */}

                        <td className="p-5">

                          <p className="font-semibold">

                            {receipt.user?.full_name ||
                              "BizAI Customer"}

                          </p>

                          <p className="text-slate-500 text-sm mt-1">

                            {receipt.user?.email ||
                              "Email unavailable"}

                          </p>

                        </td>

                        {/* PLAN */}

                        <td className="p-5">

                          <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full">

                            {receipt.plan}

                          </span>

                        </td>

                        {/* AMOUNT */}

                        <td className="p-5 text-green-400 font-semibold">

                          {formatMoney(
                            receipt.amount
                          )}

                        </td>

                        {/* PAYMENT ID */}

                        <td className="p-5">

                          <span className="text-slate-400 text-sm">

                            {receipt.payment_id}

                          </span>

                        </td>

                        {/* BILLING */}

                        <td className="p-5">

                          <span className="capitalize text-slate-300">

                            🔁{" "}

                            {receipt.billing_cycle ||
                              "Monthly"}

                          </span>

                        </td>

                        {/* PAYMENT DATE */}

                        <td className="p-5 text-slate-400">

                          {formatDate(
                            receipt.payment_date
                          )}

                        </td>

                        {/* EXPIRY */}

                        <td className="p-5 text-slate-400">

                          {formatDate(
                            receipt.subscription_end
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

        {/* PLAN SUMMARY */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">

          <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-6 text-center">

            <div className="text-4xl">
              🚀
            </div>

            <p className="text-slate-400 mt-3">
              Starter Plans
            </p>

            <h2 className="text-3xl font-bold text-blue-400 mt-2">

              {starterCount}

            </h2>

          </div>

          <div className="bg-slate-900 border border-purple-500/20 rounded-2xl p-6 text-center">

            <div className="text-4xl">
              ⭐
            </div>

            <p className="text-slate-400 mt-3">
              Professional Plans
            </p>

            <h2 className="text-3xl font-bold text-purple-400 mt-2">

              {professionalCount}

            </h2>

          </div>

          <div className="bg-slate-900 border border-yellow-500/20 rounded-2xl p-6 text-center">

            <div className="text-4xl">
              💎
            </div>

            <p className="text-slate-400 mt-3">
              Business Plans
            </p>

            <h2 className="text-3xl font-bold text-yellow-400 mt-2">

              {businessCount}

            </h2>

          </div>

        </div>

      </div>

    </main>

  );
}

// ==============================
// PROTECTED PAGE
// ==============================

export default function PaymentReceiptsPage() {

  return (

    <OwnerProtectedRoute>

      <PaymentReceiptsContent />

    </OwnerProtectedRoute>

  );
}