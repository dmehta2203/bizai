"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  business_name: string | null;
};

type EmailTemplate = {
  id: string;
  icon: string;
  title: string;
  description: string;
  subject: string;
  purpose: string;
};

const emailTemplates: EmailTemplate[] = [
  {
    id: "payment",
    icon: "💰",
    title: "Payment Reminder",
    description:
      "Send a friendly reminder for a pending payment.",
    subject: "Friendly Payment Reminder",
    purpose:
      "Write a professional and friendly payment reminder. Politely ask the customer to complete their pending payment.",
  },

  {
    id: "followup",
    icon: "🔥",
    title: "Follow-up",
    description:
      "Follow up with a customer about your services.",
    subject: "Following Up With You",
    purpose:
      "Write a friendly professional follow-up email asking the customer if they have any questions or are interested in our services.",
  },

  {
    id: "appointment",
    icon: "📅",
    title: "Appointment Reminder",
    description:
      "Remind a customer about an upcoming appointment.",
    subject: "Appointment Reminder",
    purpose:
      "Write a professional appointment reminder email. Remind the customer about their upcoming appointment and ask them to contact us if they need any changes.",
  },

  {
    id: "thankyou",
    icon: "🙏",
    title: "Thank You",
    description:
      "Thank your customer for their business or support.",
    subject: "Thank You!",
    purpose:
      "Write a warm and professional thank-you email to the customer for their business and support.",
  },

  {
    id: "welcome",
    icon: "👋",
    title: "Welcome Customer",
    description:
      "Welcome a new customer to your business.",
    subject: "Welcome to Our Business!",
    purpose:
      "Write a warm, friendly and professional welcome email for a new customer. Thank them for choosing our business and let them know we are happy to help.",
  },
];

function EmailContent() {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState("");

  const [subject, setSubject] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [aiPurpose, setAiPurpose] =
    useState("");

  const [selectedTemplate, setSelectedTemplate] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [generating, setGenerating] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  // ==========================
  // LOAD CUSTOMERS
  // ==========================

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (
        !session?.user ||
        !session.access_token
      ) {
        window.location.href =
          "/login";

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
            email,
            phone,
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

      setCustomers(
        data || []
      );
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

  // ==========================
  // SELECTED CUSTOMER
  // ==========================

  const selectedCustomerData =
    customers.find(
      (customer) =>
        customer.id ===
        selectedCustomer
    );

  // ==========================
  // SELECT EMAIL TEMPLATE
  // ==========================

  function selectTemplate(
    template: EmailTemplate
  ) {
    setSelectedTemplate(
      template.id
    );

    setSubject(
      template.subject
    );

    setAiPurpose(
      template.purpose
    );

    setMessage("");

    setSuccess(
      `${template.title} template selected. Click Generate with AI to create the email.`
    );

    setError("");
  }

  // ==========================
  // GENERATE EMAIL WITH AI
  // ==========================

  async function generateEmail() {
    try {
      setError("");
      setSuccess("");

      if (!selectedCustomer) {
        setError(
          "Please select a customer first."
        );

        return;
      }

      if (!aiPurpose.trim()) {
        setError(
          "Please describe what the email should be about."
        );

        return;
      }

      if (!selectedCustomerData) {
        setError(
          "Customer information not found."
        );

        return;
      }

      setGenerating(true);

      // ==========================
      // GET CURRENT SESSION
      // ==========================

      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError
      ) {
        console.error(
          "AI email session error:",
          sessionError
        );

        setError(
          "Unable to verify your login session."
        );

        return;
      }

      if (!session?.user) {
        setError(
          "Please login before generating an email."
        );

        window.location.href =
          "/login";

        return;
      }

      if (!session.access_token) {
        setError(
          "Your authentication session is missing. Please log in again."
        );

        await supabase.auth.signOut();

        window.location.href =
          "/login";

        return;
      }

      // ==========================
      // GENERATE EMAIL
      // ==========================

      const response =
        await fetch(
          "/api/generate-email",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              // IMPORTANT:
              // The AI generation API now
              // requires an authenticated
              // Supabase access token.
              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                customerName:
                  selectedCustomerData.name,

                businessName:
                  selectedCustomerData.business_name,

                purpose:
                  aiPurpose.trim(),
              }),
          }
        );

      let result: any;

      try {
        result =
          await response.json();
      } catch {
        result = {
          error:
            "Invalid server response.",
        };
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to generate email."
        );
      }

      setMessage(
        result.message || ""
      );

      setSuccess(
        "AI generated your email successfully! You can edit it before sending."
      );
    } catch (error) {
      console.error(
        "AI Email Error:",
        error
      );

      if (
        error instanceof Error
      ) {
        setError(
          error.message
        );
      } else {
        setError(
          "Unable to generate email."
        );
      }
    } finally {
      setGenerating(false);
    }
  }

  // ==========================
  // SEND EMAIL
  // ==========================

  async function sendEmail() {
    try {
      setSuccess("");
      setError("");

      if (!selectedCustomer) {
        setError(
          "Please select a customer."
        );

        return;
      }

      if (!subject.trim()) {
        setError(
          "Please enter an email subject."
        );

        return;
      }

      if (!message.trim()) {
        setError(
          "Please write or generate an email message."
        );

        return;
      }

      if (
        !selectedCustomerData?.email
      ) {
        setError(
          "This customer does not have an email address."
        );

        return;
      }

      setSending(true);

      // ==========================
      // GET CURRENT SESSION
      // ==========================

      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError
      ) {
        console.error(
          "Session error:",
          sessionError
        );

        setError(
          "Unable to verify your login session."
        );

        return;
      }

      if (!session?.user) {
        window.location.href =
          "/login";

        return;
      }

      if (!session.access_token) {
        setError(
          "Your authentication session is missing. Please log in again."
        );

        await supabase.auth.signOut();

        window.location.href =
          "/login";

        return;
      }

      // ==========================
      // SEND REAL EMAIL
      // ==========================

      const response =
        await fetch(
          "/api/send-email",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                to:
                  selectedCustomerData.email,

                subject:
                  subject.trim(),

                message:
                  message.trim(),

                customerName:
                  selectedCustomerData.name,
              }),
          }
        );

      let result: any;

      try {
        result =
          await response.json();
      } catch {
        result = {
          error:
            "Invalid server response.",
        };
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to send email."
        );
      }

      // ==========================
      // SAVE ACTIVITY
      // ==========================

      const {
        error: activityError,
      } =
        await supabase
          .from(
            "customer_activities"
          )
          .insert({
            user_id:
              session.user.id,

            customer_id:
              selectedCustomerData.id,

            activity_type:
              "Email Sent",

            activity_message:
              `Email sent to ${selectedCustomerData.email}: ${subject.trim()}`,
          });

      if (activityError) {
        console.error(
          "Activity error:",
          activityError
        );
      }

      setSuccess(
        `Email successfully sent to ${selectedCustomerData.name}!`
      );

      setSubject("");
      setMessage("");
      setAiPurpose("");
      setSelectedTemplate("");
    } catch (error) {
      console.error(
        "Email error:",
        error
      );

      if (
        error instanceof Error
      ) {
        setError(
          error.message
        );
      } else {
        setError(
          "Something went wrong while sending the email."
        );
      }
    } finally {
      setSending(false);
    }
  }

  // ==========================
  // LOADING
  // ==========================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">

          <div className="text-6xl animate-pulse">
            📧
          </div>

          <h2 className="text-xl font-semibold mt-4">
            Loading Email Center...
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

      <div className="max-w-6xl mx-auto">

        {/* HEADER */}

        <div className="mb-8">

          <p className="text-blue-400 font-semibold text-sm">
            BIZAI COMMUNICATION
          </p>

          <h1 className="text-3xl md:text-5xl font-bold mt-2">
            📧 AI Email Center
          </h1>

          <p className="text-slate-400 mt-3">
            Generate professional emails with AI and
            send them to your customers.
          </p>

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

        {/* EMAIL TEMPLATES */}

        <div className="mb-8">

          <div className="mb-5">

            <p className="text-purple-400 font-semibold text-sm">
              QUICK ACTIONS
            </p>

            <h2 className="text-2xl font-bold mt-2">
              ⚡ Email Templates
            </h2>

            <p className="text-slate-400 mt-2">
              Choose a template and let BizAI write
              the email for you.
            </p>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

            {emailTemplates.map(
              (template) => (
                <button
                  key={template.id}
                  onClick={() =>
                    selectTemplate(
                      template
                    )
                  }
                  className={`text-left rounded-2xl p-5 border transition hover:-translate-y-1 ${
                    selectedTemplate ===
                    template.id
                      ? "bg-purple-500/15 border-purple-500"
                      : "bg-slate-900 border-slate-800 hover:border-purple-500/60"
                  }`}
                >

                  <div className="text-4xl">
                    {template.icon}
                  </div>

                  <h3 className="font-bold mt-4">
                    {template.title}
                  </h3>

                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {template.description}
                  </p>

                </button>
              )
            )}

          </div>

        </div>

        {/* EMAIL FORM */}

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8">

          {/* CUSTOMER */}

          <div className="mb-6">

            <label className="text-sm font-semibold text-slate-300">
              👤 Select Customer
            </label>

            <select
              value={selectedCustomer}
              onChange={(
                event
              ) => {
                setSelectedCustomer(
                  event.target.value
                );

                setSuccess("");
                setError("");
              }}
              className="w-full mt-3 bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-blue-500"
            >

              <option value="">
                Select a customer
              </option>

              {customers.map(
                (customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.name}

                    {customer.email
                      ? ` — ${customer.email}`
                      : " — No Email"}
                  </option>
                )
              )}

            </select>

          </div>

          {/* CUSTOMER DETAILS */}

          {selectedCustomerData && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mb-6">

              <h3 className="font-bold text-lg">
                👤 Customer Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">

                <div>
                  <p className="text-slate-500">
                    Name
                  </p>

                  <p className="font-semibold mt-1">
                    {selectedCustomerData.name}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">
                    Email
                  </p>

                  <p className="font-semibold text-blue-400 mt-1">
                    {selectedCustomerData.email ||
                      "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">
                    Phone
                  </p>

                  <p className="font-semibold mt-1">
                    {selectedCustomerData.phone ||
                      "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">
                    Business
                  </p>

                  <p className="font-semibold mt-1">
                    {selectedCustomerData.business_name ||
                      "Not available"}
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* AI EMAIL WRITER */}

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 mb-6">

            <div className="flex items-center gap-3">

              <div className="text-3xl">
                🤖
              </div>

              <div>

                <h2 className="text-xl font-bold">
                  AI Email Writer
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  Describe what you want to say and
                  BizAI will write the email.
                </p>

              </div>

            </div>

            <textarea
              value={aiPurpose}
              onChange={(
                event
              ) => {
                setAiPurpose(
                  event.target.value
                );

                setSelectedTemplate("");
              }}
              placeholder="Example: Write a friendly follow-up email asking the customer if they are interested in our services..."
              rows={4}
              className="w-full mt-5 bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-purple-500 resize-none"
            />

            <button
              onClick={
                generateEmail
              }
              disabled={
                generating
              }
              className="mt-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold transition"
            >
              {generating
                ? "🤖 Generating..."
                : "✨ Generate with AI"}
            </button>

          </div>

          {/* SUBJECT */}

          <div className="mb-6">

            <label className="text-sm font-semibold text-slate-300">
              📝 Email Subject
            </label>

            <input
              type="text"
              value={subject}
              onChange={(
                event
              ) =>
                setSubject(
                  event.target.value
                )
              }
              placeholder="Enter email subject"
              className="w-full mt-3 bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-blue-500"
            />

          </div>

          {/* MESSAGE */}

          <div className="mb-6">

            <label className="text-sm font-semibold text-slate-300">
              💬 Email Message
            </label>

            <textarea
              value={message}
              onChange={(
                event
              ) =>
                setMessage(
                  event.target.value
                )
              }
              placeholder="Write your email or generate one with AI..."
              rows={12}
              className="w-full mt-3 bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-blue-500 resize-none"
            />

          </div>

          {/* EMAIL PREVIEW */}

          {selectedCustomerData &&
            message && (
              <div className="bg-slate-950 border border-slate-700 rounded-xl p-5 mb-6">

                <p className="text-slate-500 text-sm font-semibold">
                  👀 EMAIL PREVIEW
                </p>

                <div className="mt-5">

                  <p className="text-sm text-slate-500">
                    To:
                  </p>

                  <p className="text-blue-400 mt-1">
                    {selectedCustomerData.email ||
                      "No email"}
                  </p>

                </div>

                <div className="mt-4">

                  <p className="text-sm text-slate-500">
                    Subject:
                  </p>

                  <p className="font-semibold mt-1">
                    {subject ||
                      "No subject"}
                  </p>

                </div>

                <div className="border-t border-slate-800 mt-5 pt-5 whitespace-pre-wrap text-slate-300 leading-relaxed">
                  {message}
                </div>

              </div>
            )}

          {/* SEND BUTTON */}

          <button
            onClick={
              sendEmail
            }
            disabled={
              sending ||
              generating
            }
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold text-lg transition"
          >
            {sending
              ? "⏳ Sending Email..."
              : "📧 Send Email"}
          </button>

        </div>

        {/* AI INFO */}

        <div className="mt-6 bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5">

          <h3 className="font-bold">
            🤖 BizAI Email Assistant
          </h3>

          <p className="text-slate-400 mt-2 text-sm">
            Choose a ready-made template or describe
            your own requirement. BizAI will generate
            a professional email that you can review
            and edit before sending.
          </p>

        </div>

        {/* CUSTOMER COUNT */}

        <div className="mt-6 text-center text-slate-500 text-sm">
          👥 {customers.length} customer(s)
          available for communication
        </div>

      </div>
    </main>
  );
}

// ==========================
// PROTECTED PAGE
// ==========================

export default function EmailPage() {
  return (
    <ProtectedRoute>
      <EmailContent />
    </ProtectedRoute>
  );
}