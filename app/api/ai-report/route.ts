import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// ======================================
// OPENAI CLIENT
// ======================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ======================================
// SUPABASE CLIENT
// ======================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ======================================
// POST API
// ======================================

export async function POST(request: NextRequest) {
  try {
    // ======================================
    // GET REQUEST DATA
    // ======================================

    const body = await request.json();

    const { userId } = body;

    // ======================================
    // VALIDATE USER
    // ======================================

    if (!userId) {
      return NextResponse.json(
        {
          error: "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // ======================================
    // CHECK SUBSCRIPTION
    // ======================================

    const {
      data: subscription,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .select(
        "plan, status, current_period_end"
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      console.error(
        "Subscription Error:",
        subscriptionError
      );

      return NextResponse.json(
        {
          error:
            "Unable to check subscription.",
        },
        {
          status: 500,
        }
      );
    }

    // ======================================
    // CHECK SUBSCRIPTION EXISTS
    // ======================================

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "You need an active subscription to generate AI reports.",
        },
        {
          status: 403,
        }
      );
    }

    // ======================================
    // CHECK EXPIRY
    // ======================================

    if (subscription.current_period_end) {
      const expiryDate = new Date(
        subscription.current_period_end
      );

      const today = new Date();

      if (expiryDate < today) {
        return NextResponse.json(
          {
            error:
              "Your subscription has expired.",
          },
          {
            status: 403,
          }
        );
      }
    }

    // ======================================
    // CHECK PLAN ACCESS
    // ======================================

    const allowedPlans = [
      "Professional",
      "Business",
    ];

    if (
      !allowedPlans.includes(
        subscription.plan
      )
    ) {
      return NextResponse.json(
        {
          error:
            "AI Reports are available for Professional and Business plans only.",
        },
        {
          status: 403,
        }
      );
    }

    // ======================================
    // FETCH BUSINESS DATA
    // ======================================

    const [
      customersResult,
      leadsResult,
      tasksResult,
      followUpsResult,
      appointmentsResult,
      salesResult,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("*")
        .eq("user_id", userId),

      supabase
        .from("leads")
        .select("*")
        .eq("user_id", userId),

      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId),

      supabase
        .from("follow_ups")
        .select("*")
        .eq("user_id", userId),

      supabase
        .from("appointments")
        .select("*")
        .eq("user_id", userId),

      supabase
        .from("sales")
        .select("*")
        .eq("user_id", userId),
    ]);

    // ======================================
    // CHECK DATABASE ERRORS
    // ======================================

    const databaseError =
      customersResult.error ||
      leadsResult.error ||
      tasksResult.error ||
      followUpsResult.error ||
      appointmentsResult.error ||
      salesResult.error;

    if (databaseError) {
      console.error(
        "Database Error:",
        databaseError
      );

      return NextResponse.json(
        {
          error:
            "Unable to fetch business data.",
        },
        {
          status: 500,
        }
      );
    }

    // ======================================
    // GET DATA
    // ======================================

    const customers =
      customersResult.data || [];

    const leads =
      leadsResult.data || [];

    const tasks =
      tasksResult.data || [];

    const followUps =
      followUpsResult.data || [];

    const appointments =
      appointmentsResult.data || [];

    const sales =
      salesResult.data || [];

    // ======================================
    // GET TODAY DATE
    // ======================================

    const now = new Date();

    const year = now.getFullYear();

    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      now.getDate()
    ).padStart(2, "0");

    const todayString =
      `${year}-${month}-${day}`;

    // ======================================
    // SALES STATISTICS
    // ======================================

    const totalRevenue =
      sales.reduce(
        (total: number, sale: any) =>
          total +
          Number(sale.amount || 0),
        0
      );

    const paidRevenue =
      sales
        .filter(
          (sale: any) =>
            sale.payment_status === "Paid"
        )
        .reduce(
          (
            total: number,
            sale: any
          ) =>
            total +
            Number(sale.amount || 0),
          0
        );

    const pendingRevenue =
      sales
        .filter(
          (sale: any) =>
            sale.payment_status === "Pending"
        )
        .reduce(
          (
            total: number,
            sale: any
          ) =>
            total +
            Number(sale.amount || 0),
          0
        );

    // ======================================
    // LEAD STATISTICS
    // ======================================

    const newLeads =
      leads.filter(
        (lead: any) =>
          lead.status === "New"
      ).length;

    const contactedLeads =
      leads.filter(
        (lead: any) =>
          lead.status === "Contacted"
      ).length;

    const interestedLeads =
      leads.filter(
        (lead: any) =>
          lead.status === "Interested"
      ).length;

    const negotiationLeads =
      leads.filter(
        (lead: any) =>
          lead.status === "Negotiation"
      ).length;

    const convertedLeads =
      leads.filter(
        (lead: any) =>
          lead.status === "Converted"
      ).length;

    // ======================================
    // CALCULATE CONVERSION RATE
    // ======================================

    const conversionRate =
      leads.length > 0
        ? Number(
            (
              (convertedLeads /
                leads.length) *
              100
            ).toFixed(1)
          )
        : 0;

    // ======================================
    // TASK STATISTICS
    // ======================================

    const completedTasks =
      tasks.filter(
        (task: any) =>
          task.status === "Completed"
      ).length;

    const pendingTasks =
      tasks.filter(
        (task: any) =>
          task.status === "Pending"
      ).length;

    const overdueTasks =
      tasks.filter((task: any) => {
        if (
          task.status === "Completed" ||
          !task.due_date
        ) {
          return false;
        }

        return (
          task.due_date < todayString
        );
      }).length;

    const taskCompletionRate =
      tasks.length > 0
        ? Number(
            (
              (completedTasks /
                tasks.length) *
              100
            ).toFixed(1)
          )
        : 0;

    // ======================================
    // FOLLOW-UP STATISTICS
    // ======================================

    const completedFollowUps =
      followUps.filter(
        (followUp: any) =>
          followUp.completed === true
      ).length;

    const pendingFollowUps =
      followUps.filter(
        (followUp: any) =>
          followUp.completed !== true
      ).length;

    const overdueFollowUps =
      followUps.filter(
        (followUp: any) =>
          followUp.completed !== true &&
          followUp.due_date <
            todayString
      ).length;

    const followUpsToday =
      followUps.filter(
        (followUp: any) =>
          followUp.completed !== true &&
          followUp.due_date ===
            todayString
      ).length;

    // ======================================
    // APPOINTMENT STATISTICS
    // ======================================

    const appointmentsToday =
      appointments.filter(
        (appointment: any) =>
          appointment.appointment_date ===
          todayString
      ).length;

    // ======================================
    // BUSINESS HEALTH SCORE
    // ======================================

    let healthScore = 100;

    healthScore -=
      overdueTasks * 10;

    healthScore -=
      overdueFollowUps * 10;

    healthScore -=
      Math.min(
        pendingTasks * 3,
        20
      );

    healthScore -=
      Math.min(
        newLeads * 2,
        10
      );

    if (healthScore < 0) {
      healthScore = 0;
    }

    if (healthScore > 100) {
      healthScore = 100;
    }

    // ======================================
    // CREATE REPORT DATA
    // ======================================

    const reportData = {
      subscription: {
        plan: subscription.plan,
      },

      business: {
        totalCustomers:
          customers.length,

        totalAppointments:
          appointments.length,

        appointmentsToday:
          appointmentsToday,

        healthScore:
          healthScore,
      },

      sales: {
        totalSales:
          sales.length,

        totalRevenue:
          totalRevenue,

        paidRevenue:
          paidRevenue,

        pendingRevenue:
          pendingRevenue,
      },

      leads: {
        total:
          leads.length,

        new:
          newLeads,

        contacted:
          contactedLeads,

        interested:
          interestedLeads,

        negotiation:
          negotiationLeads,

        converted:
          convertedLeads,

        conversionRate:
          conversionRate,
      },

      tasks: {
        total:
          tasks.length,

        completed:
          completedTasks,

        pending:
          pendingTasks,

        overdue:
          overdueTasks,

        completionRate:
          taskCompletionRate,
      },

      followUps: {
        total:
          followUps.length,

        completed:
          completedFollowUps,

        pending:
          pendingFollowUps,

        overdue:
          overdueFollowUps,

        dueToday:
          followUpsToday,
      },
    };

    // ======================================
    // AI SYSTEM PROMPT
    // ======================================

    const systemPrompt = `

You are BizAI, an expert AI Business Consultant.

Create a professional and personalized
Daily Business Report using ONLY the
real business data provided below.

BUSINESS DATA:

${JSON.stringify(
  reportData,
  null,
  2
)}

IMPORTANT RULES:

1. Never invent business numbers.

2. Always use the real data.

3. Use Indian Rupees (₹) for money.

4. Keep the report professional
and easy to understand.

5. Focus on practical actions.

6. If there is no data in an area,
clearly mention that instead of
inventing information.

7. Highlight urgent problems first.

Create the report using exactly
these sections:

# 📊 Executive Summary

Give a short overview of the
overall business situation.

# 🏥 Business Health

Analyze the business health score
and explain what is affecting it.

# 💰 Revenue Analysis

Analyze:

- Total revenue
- Paid revenue
- Pending payments
- Revenue opportunities

# 🎯 Lead Performance

Analyze:

- Lead pipeline
- Conversion rate
- Interested leads
- Negotiation leads
- Conversion opportunities

# 📋 Productivity Analysis

Analyze:

- Completed tasks
- Pending tasks
- Overdue tasks
- Task completion rate

# 📞 Follow-up Analysis

Analyze:

- Pending follow-ups
- Overdue follow-ups
- Follow-ups due today

# 📅 Appointment Overview

Analyze today's appointments
and appointment activity.

# 🔥 Top Priorities

Give the 5 most important things
the business owner should focus on.

# 💡 Growth Recommendations

Give practical and personalized
recommendations for growing the business.

# 🚀 Action Plan For Today

Give a simple step-by-step action plan
that the business owner can follow today.

Make the report useful, clear,
professional and actionable.

`;

    // ======================================
    // CALL OPENAI
    // ======================================

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",

        messages: [
          {
            role: "system",
            content: systemPrompt,
          },

          {
            role: "user",
            content:
              "Generate my complete AI Daily Business Report.",
          },
        ],

        temperature: 0.6,
      });

    // ======================================
    // GET AI RESPONSE
    // ======================================

    const report =
      completion.choices[0]
        ?.message?.content;

    if (!report) {
      return NextResponse.json(
        {
          error:
            "AI could not generate the business report.",
        },
        {
          status: 500,
        }
      );
    }

    // ======================================
    // RETURN REPORT
    // ======================================

    return NextResponse.json({
      success: true,

      report: report,

      reportData: reportData,

      generatedAt:
        new Date().toISOString(),
    });

  } catch (error: any) {
    console.error(
      "AI Report Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Something went wrong while generating the AI Report.",
      },
      {
        status: 500,
      }
    );
  }
}