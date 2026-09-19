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

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

// ======================================
// POST API
// ======================================

export async function POST(
  request: NextRequest
) {
  try {

    // ======================================
    // GET REQUEST DATA
    // ======================================

    const body =
      await request.json();

    const { userId } =
      body;

    // ======================================
    // VALIDATE USER
    // ======================================

    if (!userId) {

      return NextResponse.json(
        {
          error:
            "User ID is required.",
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
      .eq(
        "user_id",
        userId
      )
      .eq(
        "status",
        "active"
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
            "You need an active subscription to generate a Business Report.",
        },
        {
          status: 403,
        }
      );

    }

    // ======================================
    // CHECK EXPIRY
    // ======================================

    if (
      subscription.current_period_end
    ) {

      const expiryDate =
        new Date(
          subscription.current_period_end
        );

      const today =
        new Date();

      if (
        expiryDate < today
      ) {

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
            "AI Business Reports are available for Professional and Business plans only.",
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
    ] =
      await Promise.all([

        supabase
          .from("customers")
          .select("*")
          .eq(
            "user_id",
            userId
          ),

        supabase
          .from("leads")
          .select("*")
          .eq(
            "user_id",
            userId
          ),

        supabase
          .from("tasks")
          .select("*")
          .eq(
            "user_id",
            userId
          ),

        supabase
          .from("follow_ups")
          .select("*")
          .eq(
            "user_id",
            userId
          ),

        supabase
          .from("appointments")
          .select("*")
          .eq(
            "user_id",
            userId
          ),

        supabase
          .from("sales")
          .select("*")
          .eq(
            "user_id",
            userId
          ),

      ]);

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
    // TODAY
    // ======================================

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const todayString =
      today
        .toISOString()
        .split("T")[0];

    // ======================================
    // REVENUE CALCULATIONS
    // ======================================

    const totalRevenue =
      sales.reduce(
        (
          total: number,
          sale: any
        ) =>
          total +
          Number(
            sale.amount || 0
          ),
        0
      );

    const paidRevenue =
      sales
        .filter(
          (sale: any) =>
            sale.payment_status ===
            "Paid"
        )
        .reduce(
          (
            total: number,
            sale: any
          ) =>
            total +
            Number(
              sale.amount || 0
            ),
          0
        );

    const pendingRevenue =
      sales
        .filter(
          (sale: any) =>
            sale.payment_status ===
            "Pending"
        )
        .reduce(
          (
            total: number,
            sale: any
          ) =>
            total +
            Number(
              sale.amount || 0
            ),
          0
        );

    // ======================================
    // LEAD STATISTICS
    // ======================================

    const totalLeads =
      leads.length;

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
          lead.status ===
          "Interested"
      ).length;

    const negotiationLeads =
      leads.filter(
        (lead: any) =>
          lead.status ===
          "Negotiation"
      ).length;

    const convertedLeads =
      leads.filter(
        (lead: any) =>
          lead.status ===
          "Converted"
      ).length;

    const conversionRate =
      totalLeads > 0
        ? Number(
            (
              (convertedLeads /
                totalLeads) *
              100
            ).toFixed(1)
          )
        : 0;

    // ======================================
    // TASK STATISTICS
    // ======================================

    const totalTasks =
      tasks.length;

    const completedTasks =
      tasks.filter(
        (task: any) =>
          task.status ===
          "Completed"
      ).length;

    const pendingTasks =
      tasks.filter(
        (task: any) =>
          task.status ===
          "Pending"
      ).length;

    const overdueTasks =
      tasks.filter(
        (task: any) => {

          if (
            !task.due_date ||
            task.status ===
              "Completed"
          ) {
            return false;
          }

          const dueDate =
            new Date(
              task.due_date
            );

          dueDate.setHours(
            0,
            0,
            0,
            0
          );

          return dueDate < today;

        }
      ).length;

    const taskCompletionRate =
      totalTasks > 0
        ? Number(
            (
              (completedTasks /
                totalTasks) *
              100
            ).toFixed(1)
          )
        : 0;

    // ======================================
    // FOLLOW-UP STATISTICS
    // ======================================

    const totalFollowUps =
      followUps.length;

    const completedFollowUps =
      followUps.filter(
        (followUp: any) =>
          followUp.completed ===
          true
      ).length;

    const pendingFollowUps =
      followUps.filter(
        (followUp: any) =>
          followUp.completed !==
          true
      ).length;

    const overdueFollowUps =
      followUps.filter(
        (followUp: any) => {

          if (
            followUp.completed
          ) {
            return false;
          }

          return (
            followUp.due_date <
            todayString
          );

        }
      ).length;

    const followUpCompletionRate =
      totalFollowUps > 0
        ? Number(
            (
              (completedFollowUps /
                totalFollowUps) *
              100
            ).toFixed(1)
          )
        : 0;

    // ======================================
    // BUSINESS HEALTH SCORE
    // ======================================

    let healthScore =
      100;

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
        pendingFollowUps * 2,
        15
      );

    if (
      healthScore < 0
    ) {
      healthScore = 0;
    }

    // ======================================
    // BUSINESS DATA
    // ======================================

    const businessData = {

      businessOverview: {

        customers:
          customers.length,

        appointments:
          appointments.length,

        healthScore,

      },

      revenue: {

        totalRevenue,

        paidRevenue,

        pendingRevenue,

        totalSales:
          sales.length,

      },

      leads: {

        totalLeads,

        newLeads,

        contactedLeads,

        interestedLeads,

        negotiationLeads,

        convertedLeads,

        conversionRate,

      },

      tasks: {

        totalTasks,

        completedTasks,

        pendingTasks,

        overdueTasks,

        taskCompletionRate,

      },

      followUps: {

        totalFollowUps,

        completedFollowUps,

        pendingFollowUps,

        overdueFollowUps,

        followUpCompletionRate,

      },

    };

    // ======================================
    // AI PROMPT
    // ======================================

    const prompt = `

You are BizAI, an expert AI Business Consultant.

Create a professional Business Performance Report
using ONLY the real business data below.

BUSINESS DATA:

${JSON.stringify(
  businessData,
  null,
  2
)}

IMPORTANT RULES:

1. Never invent numbers or data.

2. Use Indian Rupees (₹)
when discussing money.

3. Clearly explain the business performance.

4. Identify important problems.

5. Identify urgent priorities.

6. Suggest practical improvements.

7. Keep the report professional
and easy to understand.

8. Give actionable recommendations.

Create the report using EXACTLY
this structure:

📊 BUSINESS PERFORMANCE SUMMARY

Write a short overall summary.

💰 REVENUE PERFORMANCE

Analyze revenue, paid revenue
and pending payments.

🎯 LEAD PERFORMANCE

Analyze the lead pipeline
and conversion rate.

📋 TASK PRODUCTIVITY

Analyze completed, pending
and overdue tasks.

📞 FOLLOW-UP PERFORMANCE

Analyze follow-up completion
and overdue follow-ups.

⚠️ KEY BUSINESS PROBLEMS

List the most important problems.

🔥 TOP PRIORITIES

List what the business owner
should focus on immediately.

🚀 GROWTH OPPORTUNITIES

Suggest realistic growth opportunities.

💡 RECOMMENDED ACTION PLAN

Give a clear step-by-step
action plan for the business owner.

Keep the report practical,
professional and useful.

`;

    // ======================================
    // CALL OPENAI
    // ======================================

    const completion =
      await openai.chat.completions.create({

        model:
          "gpt-4o-mini",

        messages: [
          {
            role:
              "system",

            content:
              "You are BizAI, a professional AI Business Consultant.",
          },

          {
            role:
              "user",

            content:
              prompt,
          },
        ],

        temperature:
          0.7,

      });

    // ======================================
    // GET RESPONSE
    // ======================================

    const report =
      completion
        .choices[0]
        ?.message
        ?.content;

    if (!report) {

      return NextResponse.json(
        {
          error:
            "AI could not generate the Business Report.",
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

      success:
        true,

      report,

      data:
        businessData,

    });

  } catch (
    error: any
  ) {

    console.error(
      "Business Report Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Something went wrong while generating the Business Report.",
      },
      {
        status: 500,
      }
    );

  }
}