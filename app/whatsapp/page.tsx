"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  business_name: string | null;
};

type MessageHistory = {
  id: string;
  customerName: string;
  phone: string;
  message: string;
  date: string;
};

function WhatsAppContent() {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [search, setSearch] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  const [messageHistory, setMessageHistory] =
    useState<MessageHistory[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  // ========================================
  // LOAD CUSTOMERS
  // ========================================

  async function loadCustomers() {
    try {
      setLoading(true);

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from("customers")
          .select(`
            id,
            name,
            phone,
            email,
            business_name
          `)
          .eq(
            "user_id",
            session.user.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {
        throw error;
      }

      setCustomers(data || []);

    } catch (error) {

      console.error(
        "Customer loading error:",
        error
      );

      setError(
        "Unable to load customers."
      );

    } finally {

      setLoading(false);

    }
  }

  // ========================================
  // FILTER CUSTOMERS
  // ========================================

  const filteredCustomers =
    customers.filter(
      (customer) => {

        const searchText =
          search.toLowerCase();

        return (

          customer.name
            .toLowerCase()
            .includes(searchText) ||

          (customer.phone || "")
            .toLowerCase()
            .includes(searchText) ||

          (customer.email || "")
            .toLowerCase()
            .includes(searchText) ||

          (
            customer.business_name || ""
          )
            .toLowerCase()
            .includes(searchText)

        );

      }
    );

  // ========================================
  // SELECT CUSTOMER
  // ========================================

  function selectCustomer(
    customer: Customer
  ) {

    setSelectedCustomer(
      customer
    );

    setSuccess("");
    setError("");

  }

  // ========================================
  // MESSAGE TEMPLATE
  // ========================================

  function useTemplate(
    template: string
  ) {

    if (!selectedCustomer) {

      setError(
        "Please select a customer first."
      );

      return;

    }

    const customerName =
      selectedCustomer.name;

    const formattedMessage =
      template.replace(
        "{name}",
        customerName
      );

    setMessage(
      formattedMessage
    );

  }

  // ========================================
  // SEND WHATSAPP MESSAGE
  // ========================================

  async function sendMessage() {

    try {

      setSuccess("");
      setError("");

      if (!selectedCustomer) {

        setError(
          "Please select a customer."
        );

        return;

      }

      if (!selectedCustomer.phone) {

        setError(
          "This customer does not have a phone number."
        );

        return;

      }

      if (!message.trim()) {

        setError(
          "Please enter a message."
        );

        return;

      }

      setSending(true);

      // ==============================
      // SEND MESSAGE THROUGH API
      // ==============================

      const response =
        await fetch(
          "/api/whatsapp/send",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({

                phone:
                  selectedCustomer.phone,

                message:
                  message.trim(),

              }),

          }
        );

      const result =
        await response.json();

      if (!response.ok) {

        throw new Error(
          result.error ||
          "Unable to send WhatsApp message."
        );

      }

      // ==============================
      // GET USER
      // ==============================

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      // ==============================
      // SAVE CUSTOMER ACTIVITY
      // ==============================

      if (session?.user) {

        await supabase
          .from(
            "customer_activities"
          )
          .insert({

            user_id:
              session.user.id,

            customer_id:
              selectedCustomer.id,

            activity_type:
              "WhatsApp",

            activity_message:
              `WhatsApp message sent: ${message.trim()}`,

          });

      }

      // ==============================
      // ADD TO LOCAL HISTORY
      // ==============================

      const newMessage = {

        id:
          Date.now().toString(),

        customerName:
          selectedCustomer.name,

        phone:
          selectedCustomer.phone,

        message:
          message.trim(),

        date:
          new Date().toISOString(),

      };

      setMessageHistory(
        (previous) => [
          newMessage,
          ...previous,
        ]
      );

      setSuccess(
        "WhatsApp message sent successfully!"
      );

      setMessage("");

    } catch (error: any) {

      console.error(
        "WhatsApp sending error:",
        error
      );

      setError(
        error.message ||
        "Unable to send WhatsApp message."
      );

    } finally {

      setSending(false);

    }
  }

  // ========================================
  // FORMAT DATE
  // ========================================

  function formatDate(
    date: string
  ) {

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    ).format(
      new Date(date)
    );

  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-6xl animate-pulse">
            💬
          </div>

          <h2 className="text-xl font-semibold mt-5">

            Loading WhatsApp Center...

          </h2>

        </div>

      </main>

    );

  }

  // ========================================
  // MAIN PAGE
  // ========================================

  return (

    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">

          <div>

            <p className="text-green-400 font-semibold text-sm">

              BIZAI COMMUNICATION

            </p>

            <h1 className="text-3xl md:text-5xl font-bold mt-2">

              💬 WhatsApp Center

            </h1>

            <p className="text-slate-400 mt-3">

              Send WhatsApp messages to your customers.

            </p>

          </div>


          <button
            onClick={loadCustomers}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-xl font-semibold"
          >

            🔄 Refresh

          </button>

        </div>


        {/* SUCCESS */}

        {success && (

          <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl p-4">

            ✅ {success}

          </div>

        )}


        {/* ERROR */}

        {error && (

          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4">

            ⚠️ {error}

          </div>

        )}


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">


          {/* LEFT SIDE */}

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">


            {/* SEARCH */}

            <div className="p-6 border-b border-slate-800">

              <h2 className="text-2xl font-bold">

                👥 Select Customer

              </h2>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="🔍 Search customers..."
                className="w-full mt-5 bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-green-500"
              />

            </div>


            {/* CUSTOMER LIST */}

            <div className="max-h-[600px] overflow-y-auto">

              {filteredCustomers.length === 0 ? (

                <div className="p-10 text-center">

                  <div className="text-5xl">

                    👥

                  </div>

                  <p className="text-slate-400 mt-4">

                    No customers found.

                  </p>

                </div>

              ) : (

                filteredCustomers.map(
                  (customer) => (

                    <button
                      key={customer.id}
                      onClick={() =>
                        selectCustomer(
                          customer
                        )
                      }
                      className={`w-full text-left p-5 border-b border-slate-800 transition ${
                        selectedCustomer?.id ===
                        customer.id
                          ? "bg-green-500/10 border-l-4 border-green-500"
                          : "hover:bg-slate-800"
                      }`}
                    >

                      <div className="flex items-center justify-between gap-4">

                        <div>

                          <h3 className="font-bold">

                            👤 {customer.name}

                          </h3>

                          <p className="text-sm text-slate-400 mt-2">

                            📱 {customer.phone ||
                              "No phone number"}

                          </p>

                          <p className="text-sm text-slate-500 mt-1">

                            📧 {customer.email ||
                              "No email"}

                          </p>

                        </div>


                        {selectedCustomer?.id ===
                          customer.id && (

                          <span className="text-green-400 font-semibold">

                            ✓

                          </span>

                        )}

                      </div>

                    </button>

                  )
                )

              )}

            </div>

          </div>


          {/* RIGHT SIDE */}

          <div>


            {/* MESSAGE BOX */}

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">

              <h2 className="text-2xl font-bold">

                💬 Send WhatsApp Message

              </h2>


              {selectedCustomer ? (

                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mt-5">

                  <p className="text-green-400 text-sm">

                    SELECTED CUSTOMER

                  </p>

                  <h3 className="font-bold text-lg mt-2">

                    👤 {selectedCustomer.name}

                  </h3>

                  <p className="text-slate-400 mt-1">

                    📱 {selectedCustomer.phone ||
                      "No phone number"}

                  </p>

                </div>

              ) : (

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 mt-5 text-slate-400">

                  👈 Select a customer to start messaging.

                </div>

              )}


              {/* MESSAGE */}

              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                placeholder="Write your WhatsApp message..."
                rows={8}
                className="w-full mt-6 bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-green-500 resize-none"
              />


              {/* TEMPLATES */}

              <div className="mt-6">

                <p className="text-sm text-slate-400 mb-3">

                  ⚡ Quick Templates

                </p>

                <div className="grid grid-cols-1 gap-3">

                  <button
                    onClick={() =>
                      useTemplate(
                        "Hello {name}! 👋 How are you? We are here to help you with anything you need."
                      )
                    }
                    className="text-left bg-slate-950 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-sm"
                  >

                    👋 Greeting Message

                  </button>


                  <button
                    onClick={() =>
                      useTemplate(
                        "Hello {name}! 👋 This is a friendly reminder regarding our previous conversation. Please let us know if you need any assistance."
                      )
                    }
                    className="text-left bg-slate-950 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-sm"
                  >

                    🔥 Follow-up Reminder

                  </button>


                  <button
                    onClick={() =>
                      useTemplate(
                        "Hello {name}! 😊 Thank you for choosing our business. We truly appreciate your support!"
                      )
                    }
                    className="text-left bg-slate-950 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-sm"
                  >

                    🙏 Thank You Message

                  </button>

                </div>

              </div>


              {/* SEND */}

              <button
                onClick={sendMessage}
                disabled={sending}
                className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 py-4 rounded-xl font-bold text-lg"
              >

                {sending
                  ? "⏳ Sending..."
                  : "💬 Send WhatsApp Message"}

              </button>

            </div>


            {/* MESSAGE HISTORY */}

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mt-8">

              <h2 className="text-xl font-bold">

                📜 Recent Messages

              </h2>


              {messageHistory.length === 0 ? (

                <div className="text-center py-8 text-slate-500">

                  No messages sent yet.

                </div>

              ) : (

                <div className="divide-y divide-slate-800 mt-5">

                  {messageHistory.map(
                    (item) => (

                      <div
                        key={item.id}
                        className="py-4"
                      >

                        <h3 className="font-semibold">

                          👤 {item.customerName}

                        </h3>

                        <p className="text-slate-400 text-sm mt-2">

                          {item.message}

                        </p>

                        <p className="text-slate-500 text-xs mt-2">

                          📅 {formatDate(
                            item.date
                          )}

                        </p>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </div>

        </div>


        {/* FOOTER */}

        <div className="text-center text-slate-500 text-sm mt-10">

          💬 BizAI WhatsApp Center •
          Smart Customer Communication

        </div>

      </div>

    </main>

  );
}


// ========================================
// PROTECTED PAGE
// ========================================

export default function WhatsAppPage() {

  return (

    <ProtectedRoute>

      <WhatsAppContent />

    </ProtectedRoute>

  );

}