"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Lead = {
  id: string;
  name: string;
  status: string;
  business_name: string | null;
};

type FollowUp = {
  id: string;
  lead_id: string | null;
  title: string;
  due_date: string | null;
  completed: boolean;
};

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
};

type Sale = {
  id: string;
  amount: number | null;
  payment_status: string;
};

type Message = {
  id: number;
  role: "user" | "ai";
  text: string;
};

export default function AssistantPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "ai",
      text: "Hi! 👋 I'm BizAI, your smart business assistant. Ask me anything about your leads, follow-ups, tasks, sales or business performance.",
    },
  ]);

  useEffect(() => {
    loadBusinessData();
  }, []);

  // =========================
  // LOAD BUSINESS DATA
  // =========================

  async function loadBusinessData() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "/login";
      return;
    }

    const userId = session.user.id;

    const [
      leadsResult,
      followUpsResult,
      tasksResult,
      salesResult,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, name, status, business_name"
        )
        .eq("user_id", userId),

      supabase
        .from("follow_ups")
        .select(
          "id, lead_id, title, due_date, completed"
        )
        .eq("user_id", userId),

      supabase
        .from("tasks")
        .select(
          "id, title, status, priority, due_date"
        )
        .eq("user_id", userId),

      supabase
        .from("sales")
        .select(
          "id, amount, payment_status"
        )
        .eq("user_id", userId),
    ]);

    setLeads(leadsResult.data || []);
    setFollowUps(followUpsResult.data || []);
    setTasks(tasksResult.data || []);
    setSales(salesResult.data || []);

    setLoading(false);
  }

  // =========================
  // HELPERS
  // =========================

  function getToday() {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return today;
  }

  function isOverdue(date: string | null) {
    if (!date) return false;

    const today = getToday();

    const itemDate = new Date(date);

    itemDate.setHours(0, 0, 0, 0);

    return itemDate < today;
  }

  function isDueToday(date: string | null) {
    if (!date) return false;

    const today = getToday();

    const itemDate = new Date(date);

    itemDate.setHours(0, 0, 0, 0);

    return (
      itemDate.getTime() ===
      today.getTime()
    );
  }

  function getLeadName(
    leadId: string | null
  ) {
    if (!leadId) return "Unknown Lead";

    return (
      leads.find(
        (lead) =>
          lead.id === leadId
      )?.name || "Unknown Lead"
    );
  }

  // =========================
  // BUSINESS STATS
  // =========================

  const newLeads = leads.filter(
    (lead) =>
      lead.status === "New"
  );

  const contactedLeads = leads.filter(
    (lead) =>
      lead.status === "Contacted"
  );

  const interestedLeads = leads.filter(
    (lead) =>
      lead.status === "Interested"
  );

  const negotiationLeads = leads.filter(
    (lead) =>
      lead.status === "Negotiation"
  );

  const convertedLeads = leads.filter(
    (lead) =>
      lead.status === "Converted"
  );

  const overdueFollowUps =
    followUps.filter(
      (followUp) =>
        !followUp.completed &&
        isOverdue(
          followUp.due_date
        )
    );

  const todayFollowUps =
    followUps.filter(
      (followUp) =>
        !followUp.completed &&
        isDueToday(
          followUp.due_date
        )
    );

  const overdueTasks =
    tasks.filter(
      (task) =>
        task.status !== "Completed" &&
        isOverdue(task.due_date)
    );

  const pendingSales =
    sales.filter(
      (sale) =>
        sale.payment_status ===
        "Pending"
    );

  const pendingAmount =
    pendingSales.reduce(
      (total, sale) =>
        total +
        Number(sale.amount || 0),
      0
    );

  const completedSales =
    sales.filter(
      (sale) =>
        sale.payment_status ===
        "Paid"
    );

  const revenue =
    completedSales.reduce(
      (total, sale) =>
        total +
        Number(sale.amount || 0),
      0
    );

  // =========================
  // AI RESPONSE ENGINE
  // =========================

  function generateResponse(
    userQuestion: string
  ) {
    const q =
      userQuestion.toLowerCase();

    // =====================
    // LEADS TO FOCUS ON
    // =====================

    if (
      q.includes("focus") ||
      q.includes("lead today") ||
      q.includes("which lead") ||
      q.includes("priority lead")
    ) {
      if (
        negotiationLeads.length > 0
      ) {
        const lead =
          negotiationLeads[0];

        return `🎯 Focus on ${lead.name} today.

This lead is currently in Negotiation, which means they are close to conversion.

Recommended actions:
• Contact ${lead.name}
• Discuss final pricing
• Handle objections
• Ask about decision timeline
• Try to close the deal

You currently have:
• ${negotiationLeads.length} negotiation lead(s)
• ${interestedLeads.length} interested lead(s)
• ${newLeads.length} new lead(s)

Your best priority is closing existing opportunities before searching for more leads.`;
      }

      if (
        interestedLeads.length > 0
      ) {
        const lead =
          interestedLeads[0];

        return `🔥 Focus on ${lead.name} today.

This lead is Interested and has good conversion potential.

Recommended actions:
• Contact the lead
• Understand their requirements
• Discuss pricing
• Solve objections
• Move them toward Negotiation

You currently have ${interestedLeads.length} interested lead(s), so converting them should be your top sales priority.`;
      }

      if (
        newLeads.length > 0
      ) {
        const lead =
          newLeads[0];

        return `🎯 Focus on ${lead.name} today.

This is currently a New lead.

Recommended actions:
• Make first contact
• Understand their needs
• Ask about budget
• Understand their timeline
• Move the lead to Contacted

You currently have ${newLeads.length} new lead(s), ${interestedLeads.length} interested lead(s), and ${negotiationLeads.length} negotiation lead(s).`;
      }

      return `📊 You currently don't have any active leads to focus on.

Try adding new leads to start building your sales pipeline.`;
    }

    // =====================
    // OVERDUE FOLLOW UPS
    // =====================

    if (
      q.includes("overdue follow") ||
      q.includes("missed follow")
    ) {
      if (
        overdueFollowUps.length === 0
      ) {
        return `✅ Great news! You have no overdue follow-ups.

Keep scheduling and completing follow-ups to maintain strong customer relationships.`;
      }

      const followUpList =
        overdueFollowUps
          .map(
            (followUp, index) =>
              `${index + 1}. ${getLeadName(
                followUp.lead_id
              )} — ${followUp.title}`
          )
          .join("\n");

      return `🚨 You have ${overdueFollowUps.length} overdue follow-up(s):

${followUpList}

Recommended action:
Contact these leads as soon as possible. Delayed follow-ups can reduce your conversion chances.`;
    }

    // =====================
    // FOLLOW UPS TODAY
    // =====================

    if (
      q.includes("follow up today") ||
      q.includes("followup today") ||
      q.includes("today follow")
    ) {
      if (
        todayFollowUps.length === 0
      ) {
        return `📅 You have no follow-ups scheduled for today.`;
      }

      const followUpList =
        todayFollowUps
          .map(
            (followUp, index) =>
              `${index + 1}. ${getLeadName(
                followUp.lead_id
              )} — ${followUp.title}`
          )
          .join("\n");

      return `📞 You have ${todayFollowUps.length} follow-up(s) scheduled for today:

${followUpList}

Try to complete these before the end of the day.`;
    }

    // =====================
    // PENDING PAYMENTS
    // =====================

    if (
      q.includes("pending payment") ||
      q.includes("pending money") ||
      q.includes("collect payment")
    ) {
      if (
        pendingSales.length === 0
      ) {
        return `💰 Excellent! You currently have no pending payments.`;
      }

      return `💰 You have ${pendingSales.length} pending payment(s).

Total pending amount:
₹${pendingAmount.toLocaleString(
        "en-IN"
      )}

Recommended action:
• Contact customers with pending payments
• Send payment reminders
• Confirm payment deadlines
• Update payment status after collection`;
    }

    // =====================
    // REVENUE
    // =====================

    if (
      q.includes("revenue") ||
      q.includes("sales performance") ||
      q.includes("earn")
    ) {
      return `📊 Revenue Summary

💰 Total Revenue:
₹${revenue.toLocaleString(
        "en-IN"
      )}

⏳ Pending Amount:
₹${pendingAmount.toLocaleString(
        "en-IN"
      )}

💳 Paid Sales:
${completedSales.length}

🕒 Pending Payments:
${pendingSales.length}

Your next opportunity is to collect pending payments and convert more interested leads into customers.`;
    }

    // =====================
    // TASKS
    // =====================

    if (
      q.includes("task") ||
      q.includes("work today") ||
      q.includes("overdue work")
    ) {
      if (
        overdueTasks.length === 0
      ) {
        return `✅ You have no overdue tasks right now.

Your task management is looking good!`;
      }

      const taskList =
        overdueTasks
          .map(
            (task, index) =>
              `${index + 1}. ${task.title}`
          )
          .join("\n");

      return `📋 You have ${overdueTasks.length} overdue task(s):

${taskList}

Recommended action:
Complete overdue tasks before working on lower-priority activities.`;
    }

    // =====================
    // LEAD SUMMARY
    // =====================

    if (
      q.includes("lead summary") ||
      q.includes("pipeline") ||
      q.includes("leads")
    ) {
      return `🎯 Lead Pipeline Summary

🆕 New:
${newLeads.length}

📞 Contacted:
${contactedLeads.length}

🔥 Interested:
${interestedLeads.length}

🤝 Negotiation:
${negotiationLeads.length}

✅ Converted:
${convertedLeads.length}

📊 Total Leads:
${leads.length}

Best strategy:
Focus first on Negotiation → Interested → New leads.`;
    }

    // =====================
    // BUSINESS SUMMARY
    // =====================

    if (
      q.includes("summary") ||
      q.includes("business performance") ||
      q.includes("how is my business") ||
      q.includes("business report")
    ) {
      return `🤖 BizAI Business Summary

🎯 Leads:
${leads.length}

🔥 Interested Leads:
${interestedLeads.length}

🤝 Negotiation Leads:
${negotiationLeads.length}

🚨 Overdue Follow-ups:
${overdueFollowUps.length}

📋 Overdue Tasks:
${overdueTasks.length}

💰 Revenue:
₹${revenue.toLocaleString(
        "en-IN"
      )}

⏳ Pending Payments:
₹${pendingAmount.toLocaleString(
        "en-IN"
      )}

🎯 Today's Recommendation:

${
  overdueFollowUps.length > 0
    ? "Complete overdue follow-ups first."
    : negotiationLeads.length > 0
    ? "Focus on closing negotiation leads."
    : interestedLeads.length > 0
    ? "Convert interested leads."
    : newLeads.length > 0
    ? "Contact your new leads."
    : "Add new leads and grow your pipeline."
}`;
    }

    // =====================
    // DEFAULT RESPONSE
    // =====================

    return `🤖 I analyzed your business data.

Here is a quick overview:

🎯 ${leads.length} total leads
🔥 ${interestedLeads.length} interested leads
🤝 ${negotiationLeads.length} negotiation leads
🚨 ${overdueFollowUps.length} overdue follow-ups
📋 ${overdueTasks.length} overdue tasks
💰 ₹${revenue.toLocaleString(
      "en-IN"
    )} total revenue
⏳ ₹${pendingAmount.toLocaleString(
      "en-IN"
    )} pending payments

Try asking me:

• Which leads should I focus on today?
• Show my overdue follow-ups
• How much pending payment do I have?
• Show my revenue
• Give me a business summary
• How is my sales pipeline?`;
  }

  // =========================
  // SEND MESSAGE
  // =========================

  function sendMessage(
    customQuestion?: string
  ) {
    const userQuestion =
      customQuestion || question;

    if (!userQuestion.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: userQuestion,
    };

    const aiMessage: Message = {
      id: Date.now() + 1,
      role: "ai",
      text: generateResponse(
        userQuestion
      ),
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
      aiMessage,
    ]);

    setQuestion("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-6xl mb-5">
            🤖
          </div>

          <h2 className="text-2xl font-bold">
            BizAI is loading your business...
          </h2>

          <p className="text-slate-400 mt-3">
            Analyzing your real business data.
          </p>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-6xl mx-auto">

        {/* HEADER */}

        <div className="mb-8">

          <h1 className="text-3xl md:text-4xl font-bold">

            🤖 BizAI Smart Business Assistant

          </h1>

          <p className="text-slate-400 mt-2">

            Ask questions and get smart insights
            from your real business data.

          </p>

        </div>


        {/* BUSINESS STATS */}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

          <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-4">

            <p className="text-slate-400 text-sm">
              🎯 Leads
            </p>

            <p className="text-2xl font-bold mt-2">
              {leads.length}
            </p>

          </div>


          <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-4">

            <p className="text-slate-400 text-sm">
              🔥 Hot Leads
            </p>

            <p className="text-2xl font-bold mt-2">
              {
                interestedLeads.length +
                negotiationLeads.length
              }
            </p>

          </div>


          <div className="bg-slate-900 border border-green-500/30 rounded-xl p-4">

            <p className="text-slate-400 text-sm">
              💰 Revenue
            </p>

            <p className="text-xl font-bold mt-2">

              ₹
              {revenue.toLocaleString(
                "en-IN"
              )}

            </p>

          </div>


          <div className="bg-slate-900 border border-red-500/30 rounded-xl p-4">

            <p className="text-slate-400 text-sm">
              🚨 Urgent
            </p>

            <p className="text-2xl font-bold mt-2">

              {
                overdueFollowUps.length +
                overdueTasks.length
              }

            </p>

          </div>

        </div>


        {/* QUICK QUESTIONS */}

        <div className="mb-8">

          <h2 className="text-lg font-semibold mb-4">

            ⚡ Quick Questions

          </h2>

          <div className="flex flex-wrap gap-3">

            <button
              onClick={() =>
                sendMessage(
                  "Which leads should I focus on today?"
                )
              }
              className="bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 px-4 py-2 rounded-xl text-sm"
            >
              🎯 Which leads should I focus on?
            </button>


            <button
              onClick={() =>
                sendMessage(
                  "Show my overdue follow-ups"
                )
              }
              className="bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 px-4 py-2 rounded-xl text-sm"
            >
              🚨 Overdue Follow-ups
            </button>


            <button
              onClick={() =>
                sendMessage(
                  "How much pending payment do I have?"
                )
              }
              className="bg-yellow-600/20 border border-yellow-500/40 hover:bg-yellow-600/30 px-4 py-2 rounded-xl text-sm"
            >
              💰 Pending Payments
            </button>


            <button
              onClick={() =>
                sendMessage(
                  "Give me a business summary"
                )
              }
              className="bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 px-4 py-2 rounded-xl text-sm"
            >
              📊 Business Summary
            </button>


            <button
              onClick={() =>
                sendMessage(
                  "How is my sales pipeline?"
                )
              }
              className="bg-green-600/20 border border-green-500/40 hover:bg-green-600/30 px-4 py-2 rounded-xl text-sm"
            >
              📈 Sales Pipeline
            </button>

        </div>

        </div>


        {/* CHAT */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

          <div className="border-b border-slate-800 p-5 flex items-center justify-between">

            <div>

              <h2 className="font-bold text-lg">
                🤖 Chat with BizAI
              </h2>

              <p className="text-slate-400 text-sm mt-1">
                Your AI-powered business assistant
              </p>

            </div>


            <button
              onClick={loadBusinessData}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              🔄 Refresh Data
            </button>

          </div>


          {/* MESSAGES */}

          <div className="h-[500px] overflow-y-auto p-5 space-y-5 bg-slate-950">

            {messages.map((message) => (

              <div
                key={message.id}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 whitespace-pre-line ${
                    message.role === "user"
                      ? "bg-blue-600"
                      : "bg-slate-800 border border-slate-700"
                  }`}
                >

                  <div className="text-sm mb-2 opacity-70">

                    {message.role === "user"
                      ? "You"
                      : "🤖 BizAI"}

                  </div>

                  <p className="text-sm leading-6">

                    {message.text}

                  </p>

                </div>

              </div>

            ))}

          </div>


          {/* INPUT */}

          <div className="p-4 border-t border-slate-800">

            <div className="flex gap-3">

              <input
                type="text"
                value={question}
                onChange={(e) =>
                  setQuestion(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter"
                  ) {
                    sendMessage();
                  }
                }}
                placeholder="Ask BizAI about your business..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
              />


              <button
                onClick={() =>
                  sendMessage()
                }
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold"
              >
                Send 🚀
              </button>

            </div>

          </div>

        </div>


        {/* EXAMPLES */}

        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6">

          <h2 className="text-xl font-bold mb-5">

            💡 Things You Can Ask BizAI

          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">

            <p>
              🎯 Which leads should I focus on today?
            </p>

            <p>
              📞 Show my overdue follow-ups
            </p>

            <p>
              💰 How much pending payment do I have?
            </p>

            <p>
              📊 Give me a business summary
            </p>

            <p>
              📈 How is my sales pipeline?
            </p>

            <p>
              💵 Show my revenue performance
            </p>

            <p>
              📋 What tasks are overdue?
            </p>

            <p>
              🚀 How is my business doing?
            </p>

          </div>

        </div>

      </div>

    </main>
  );
}