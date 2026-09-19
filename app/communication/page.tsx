"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  business_name: string | null;
};

type Activity = {
  id: string;
  customer_id: string;
  activity_type: string;
  activity_message: string;
  created_at: string;
};

function CommunicationContent() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  useEffect(() => {
    loadCommunicationData();
  }, []);

  // ==========================
  // LOAD DATA
  // ==========================

  async function loadCommunicationData() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      const userId = session.user.id;

      const [
        customersResult,
        activitiesResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select(`
            id,
            name,
            phone,
            email,
            business_name
          `)
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("customer_activities")
          .select(`
            id,
            customer_id,
            activity_type,
            activity_message,
            created_at
          `)
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          })
          .limit(50),
      ]);

      if (customersResult.error) {
        throw customersResult.error;
      }

      if (activitiesResult.error) {
        throw activitiesResult.error;
      }

      setCustomers(
        customersResult.data || []
      );

      setActivities(
        activitiesResult.data || []
      );

    } catch (error) {
      console.error(
        "Communication error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================
  // FORMAT DATE
  // ==========================

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    ).format(new Date(date));
  }

  // ==========================
  // ACTIVITY ICON
  // ==========================

  function getActivityIcon(
    type: string
  ) {
    const lowerType =
      type.toLowerCase();

    if (
      lowerType.includes("whatsapp")
    ) {
      return "💬";
    }

    if (
      lowerType.includes("email")
    ) {
      return "📧";
    }

    if (
      lowerType.includes("follow")
    ) {
      return "🔥";
    }

    if (
      lowerType.includes("appointment")
    ) {
      return "📅";
    }

    if (
      lowerType.includes("contact")
    ) {
      return "📞";
    }

    return "📝";
  }

  // ==========================
  // FORMAT WHATSAPP NUMBER
  // ==========================

  function getWhatsAppNumber(
    phone: string
  ) {
    let number =
      phone.replace(/\D/g, "");

    // Indian 10-digit number
    if (number.length === 10) {
      number = `91${number}`;
    }

    return number;
  }

  // ==========================
  // OPEN WHATSAPP
  // ==========================

  async function openWhatsApp() {
    if (!selectedCustomer) {
      alert(
        "Please select a customer first."
      );
      return;
    }

    if (!selectedCustomer.phone) {
      alert(
        "This customer does not have a phone number."
      );
      return;
    }

    const number =
      getWhatsAppNumber(
        selectedCustomer.phone
      );

    window.open(
      `https://wa.me/${number}`,
      "_blank"
    );

    // Save activity
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return;
    }

    await supabase
      .from("customer_activities")
      .insert({
        user_id: session.user.id,
        customer_id:
          selectedCustomer.id,
        activity_type: "WhatsApp",
        activity_message:
          `WhatsApp conversation opened for ${selectedCustomer.name}.`,
      });

    loadCommunicationData();
  }

  // ==========================
  // OPEN EMAIL
  // ==========================

  function openEmail() {
    if (!selectedCustomer) {
      alert(
        "Please select a customer first."
      );
      return;
    }

    router.push(
      `/email?customer=${selectedCustomer.id}`
    );
  }

  // ==========================
  // SEARCH CUSTOMERS
  // ==========================

  const filteredCustomers =
    customers.filter(
      (customer) => {

        const searchText =
          search.toLowerCase();

        return (
          customer.name
            .toLowerCase()
            .includes(searchText) ||

          (customer.email || "")
            .toLowerCase()
            .includes(searchText) ||

          (customer.phone || "")
            .toLowerCase()
            .includes(searchText) ||

          (
            customer.business_name ||
            ""
          )
            .toLowerCase()
            .includes(searchText)
        );
      }
    );

  // ==========================
  // ACTIVITY STATISTICS
  // ==========================

  const whatsappActivities =
    activities.filter(
      (activity) =>
        activity.activity_type
          .toLowerCase()
          .includes("whatsapp")
    );

  const emailActivities =
    activities.filter(
      (activity) =>
        activity.activity_type
          .toLowerCase()
          .includes("email")
    );

  // ==========================
  // LOADING
  // ==========================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-6xl animate-pulse">
            💬
          </div>

          <h2 className="text-xl font-semibold mt-5">
            Loading Communication Center...
          </h2>

        </div>

      </main>
    );
  }

  // ==========================
  // MAIN PAGE
  // ==========================

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">

          <div>

            <p className="text-purple-400 font-semibold text-sm">
              BIZAI COMMUNICATION
            </p>

            <h1 className="text-3xl md:text-5xl font-bold mt-2">
              💬 Communication Center
            </h1>

            <p className="text-slate-400 mt-3">
              Manage customer communication
              from one place.
            </p>

          </div>

          <button
            onClick={loadCommunicationData}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-xl font-semibold"
          >
            🔄 Refresh
          </button>

        </div>


        {/* STATISTICS */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">

          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              👥 Customers
            </p>

            <h2 className="text-4xl font-bold text-blue-400 mt-3">
              {customers.length}
            </h2>

          </div>


          <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              💬 WhatsApp Activity
            </p>

            <h2 className="text-4xl font-bold text-green-400 mt-3">
              {whatsappActivities.length}
            </h2>

          </div>


          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6">

            <p className="text-slate-400">
              📧 Email Activity
            </p>

            <h2 className="text-4xl font-bold text-purple-400 mt-3">
              {emailActivities.length}
            </h2>

          </div>

        </div>


        {/* QUICK ACTIONS */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

          <button
            onClick={openEmail}
            className="bg-slate-900 border border-blue-500/30 hover:border-blue-500 rounded-2xl p-7 text-left transition"
          >

            <div className="text-5xl">
              📧
            </div>

            <h2 className="text-2xl font-bold mt-5">
              Send Email
            </h2>

            <p className="text-slate-400 mt-2">
              Select a customer and send
              a professional email.
            </p>

            <p className="text-blue-400 font-semibold mt-5">
              Open Email Center →
            </p>

          </button>


          <button
            onClick={openWhatsApp}
            className="bg-slate-900 border border-green-500/30 hover:border-green-500 rounded-2xl p-7 text-left transition"
          >

            <div className="text-5xl">
              💬
            </div>

            <h2 className="text-2xl font-bold mt-5">
              WhatsApp Customer
            </h2>

            <p className="text-slate-400 mt-2">
              Select a customer and start
              a WhatsApp conversation.
            </p>

            <p className="text-green-400 font-semibold mt-5">
              Open WhatsApp →
            </p>

          </button>

        </div>


        {/* CUSTOMERS */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-8">

          <div className="p-6 border-b border-slate-800">

            <h2 className="text-2xl font-bold">
              👥 Select Customer
            </h2>

            <p className="text-slate-400 mt-2">
              Choose a customer before
              sending Email or WhatsApp.
            </p>


            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="🔍 Search customers..."
              className="w-full mt-5 bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-purple-500"
            />

          </div>


          {filteredCustomers.length === 0 ? (

            <div className="p-12 text-center">

              <div className="text-5xl">
                👥
              </div>

              <h3 className="text-xl font-bold mt-4">
                No Customers Found
              </h3>

              <p className="text-slate-400 mt-2">
                Add customers to start communicating.
              </p>

            </div>

          ) : (

            <div className="divide-y divide-slate-800">

              {filteredCustomers.map(
                (customer) => (

                  <button
                    key={customer.id}
                    onClick={() =>
                      setSelectedCustomer(
                        customer
                      )
                    }
                    className={`w-full text-left p-5 transition ${
                      selectedCustomer?.id ===
                      customer.id
                        ? "bg-purple-500/10 border-l-4 border-purple-500"
                        : "hover:bg-slate-800/50"
                    }`}
                  >

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                      <div>

                        <h3 className="font-bold text-lg">

                          👤 {customer.name}

                        </h3>

                        <div className="flex flex-wrap gap-4 text-sm text-slate-400 mt-2">

                          <span>

                            📱 {customer.phone ||
                              "No phone"}

                          </span>

                          <span>

                            📧 {customer.email ||
                              "No email"}

                          </span>

                        </div>

                      </div>


                      {selectedCustomer?.id ===
                        customer.id && (

                        <span className="text-purple-400 font-semibold">

                          ✓ Selected

                        </span>

                      )}

                    </div>

                  </button>

                )
              )}

            </div>

          )}

        </div>


        {/* SELECTED CUSTOMER */}

        {selectedCustomer && (

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 mb-8">

            <p className="text-purple-400 text-sm font-semibold">
              SELECTED CUSTOMER
            </p>

            <h2 className="text-2xl font-bold mt-2">

              👤 {selectedCustomer.name}

            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 text-slate-400">

              <p>
                📱 {selectedCustomer.phone ||
                  "Phone unavailable"}
              </p>

              <p>
                📧 {selectedCustomer.email ||
                  "Email unavailable"}
              </p>

            </div>


            <div className="flex flex-col sm:flex-row gap-4 mt-6">

              <button
                onClick={openEmail}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold"
              >
                📧 Send Email
              </button>


              <button
                onClick={openWhatsApp}
                className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-semibold"
              >
                💬 Open WhatsApp
              </button>

            </div>

          </div>

        )}


        {/* COMMUNICATION HISTORY */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

          <div className="p-6 border-b border-slate-800">

            <h2 className="text-2xl font-bold">
              📜 Communication History
            </h2>

            <p className="text-slate-400 mt-2">
              Recent customer communication activity.
            </p>

          </div>


          {activities.length === 0 ? (

            <div className="p-12 text-center">

              <div className="text-5xl">
                📭
              </div>

              <h3 className="text-xl font-bold mt-4">
                No Communication Yet
              </h3>

              <p className="text-slate-400 mt-2">
                Customer communication will appear here.
              </p>

            </div>

          ) : (

            <div className="divide-y divide-slate-800">

              {activities.map(
                (activity) => {

                  const customer =
                    customers.find(
                      (item) =>
                        item.id ===
                        activity.customer_id
                    );

                  return (

                    <div
                      key={activity.id}
                      className="p-5 hover:bg-slate-800/40"
                    >

                      <div className="flex gap-4">

                        <div className="text-3xl">

                          {getActivityIcon(
                            activity.activity_type
                          )}

                        </div>


                        <div className="flex-1">

                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">

                            <h3 className="font-bold">

                              {activity.activity_type}

                            </h3>

                            <p className="text-xs text-slate-500">

                              {formatDate(
                                activity.created_at
                              )}

                            </p>

                          </div>


                          <p className="text-slate-300 mt-2">

                            {activity.activity_message}

                          </p>


                          <p className="text-sm text-purple-400 mt-3">

                            👤 {customer?.name ||
                              "Customer"}

                          </p>

                        </div>

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          )}

        </div>


        {/* FOOTER */}

        <div className="text-center text-slate-500 text-sm mt-10 pb-5">

          💬 BizAI Communication Center •
          WhatsApp • Email • Customer Engagement

        </div>

      </div>

    </main>
  );
}


// ==========================
// PROTECTED PAGE
// ==========================

export default function CommunicationPage() {

  return (

    <ProtectedRoute>

      <CommunicationContent />

    </ProtectedRoute>

  );
}