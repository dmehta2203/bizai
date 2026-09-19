import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";

// =====================================
// OPENAI CLIENT
// =====================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =====================================
// SUPABASE CONFIG
// =====================================

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

// =====================================
// SUPABASE ADMIN CLIENT
// =====================================

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

// =====================================
// POST API
// =====================================

export async function POST(
  request: NextRequest
) {
  try {
    // =====================================
    // GET AUTHORIZATION HEADER
    // =====================================

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    // =====================================
    // GET ACCESS TOKEN
    // =====================================

    const accessToken =
      authorization
        .replace(
          "Bearer ",
          ""
        )
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Authentication token is missing.",
        },
        {
          status: 401,
        }
      );
    }

    // =====================================
    // VERIFY USER WITH SUPABASE
    // =====================================

    const {
      data: {
        user: authenticatedUser,
      },
      error: authError,
    } =
      await supabase.auth.getUser(
        accessToken
      );

    if (
      authError ||
      !authenticatedUser
    ) {
      console.error(
        "Authentication error:",
        authError
      );

      return NextResponse.json(
        {
          error:
            "Invalid or expired authentication session.",
        },
        {
          status: 401,
        }
      );
    }

    // =====================================
    // TRUST ONLY VERIFIED USER ID
    // =====================================

    const userId =
      authenticatedUser.id;

    // =====================================
    // CHECK SUBSCRIPTION
    // =====================================

    const {
      data: subscription,
      error: subscriptionError,
    } =
      await supabase
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

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "Active subscription required.",
        },
        {
          status: 403,
        }
      );
    }

    // =====================================
    // CHECK EXPIRY
    // =====================================

    if (
      subscription.current_period_end
    ) {
      const expiryDate =
        new Date(
          subscription.current_period_end
        );

      const today =
        new Date();

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

    // =====================================
    // CHECK PLAN ACCESS
    // =====================================

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
            "AI Insights requires Professional or Business plan.",
        },
        {
          status: 403,
        }
      );
    }

    // =====================================
    // API RATE LIMIT
    // 20 REQUESTS / 60 SECONDS
    // =====================================

    const rateLimit =
      await checkRateLimit(
        userId,
        "/api/ai-insights",
        20,
        60
      );

    if (!rateLimit.allowed) {
      console.warn(
        "AI Insights rate limit triggered for user:",
        userId
      );

      return NextResponse.json(
        {
          error:
            rateLimit.error ||
            "Too many AI requests. Please wait a moment and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
          },
        }
      );
    }

    // =====================================
    // FETCH BUSINESS DATA
    // =====================================

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

    // =====================================
    // GET DATA
    // =====================================

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

    // =====================================
    // REVENUE CALCULATION
    // =====================================

    const totalRevenue =
      sales.reduce(
        (total, sale: any) =>
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
          (total, sale: any) =>
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
          (total, sale: any) =>
            total +
            Number(
              sale.amount || 0
            ),
          0
        );

    // =====================================
    // LEAD CALCULATION
    // =====================================

    const convertedLeads =
      leads.filter(
        (lead: any) =>
          lead.status ===
          "Converted"
      ).length;

    const newLeads =
      leads.filter(
        (lead: any) =>
          lead.status ===
          "New"
      ).length;

    const interestedLeads =
      leads.filter(
        (lead: any) =>
          lead.status ===
          "Interested"
      ).length;

    // =====================================
    // TASK CALCULATION
    // =====================================

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

    // =====================================
    // FOLLOW-UP CALCULATION
    // =====================================

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

    // =====================================
    // BUSINESS DATA
    // =====================================

    const businessData = {
      plan:
        subscription.plan,

      customers:
        customers.length,

      leads: {
        total:
          leads.length,

        new:
          newLeads,

        interested:
          interestedLeads,

        converted:
          convertedLeads,
      },

      tasks: {
        total:
          tasks.length,

        completed:
          completedTasks,

        pending:
          pendingTasks,
      },

      followUps: {
        total:
          followUps.length,

        completed:
          completedFollowUps,

        pending:
          pendingFollowUps,
      },

      appointments:
        appointments.length,

      sales: {
        total:
          sales.length,

        totalRevenue,

        paidRevenue,

        pendingRevenue,
      },
    };

    // =====================================
    // AI PROMPT
    // =====================================

    const systemPrompt = `

You are BizAI Business Insights Engine.

Analyze the following real business data.

BUSINESS DATA:

${JSON.stringify(
  businessData,
  null,
  2
)}

Generate a detailed business analysis.

Return your answer in this format:

BUSINESS HEALTH SCORE:
Give a score from 0 to 100.

PERFORMANCE SUMMARY:
Give a short summary.

KEY PROBLEMS:
List important business problems.

GROWTH OPPORTUNITIES:
List opportunities to improve.

SALES ANALYSIS:
Analyze revenue and payments.

LEAD ANALYSIS:
Analyze lead performance.

PRODUCTIVITY ANALYSIS:
Analyze tasks and follow-ups.

RECOMMENDATIONS:
Give practical action steps.

IMPORTANT:

- Use only the provided data.
- Do not invent numbers.
- Keep advice practical.
- Use Indian Rupees (₹).
- Make the response easy to understand.
- Be professional.

`;

    // =====================================
    // OPENAI REQUEST
    // =====================================

    const completion =
      await openai.chat.completions.create({
        model:
          "gpt-4o-mini",

        messages: [
          {
            role: "system",
            content:
              systemPrompt,
          },

          {
            role: "user",
            content:
              "Analyze my business and generate AI insights.",
          },
        ],

        temperature:
          0.6,
      });

    // =====================================
    // GET AI RESPONSE
    // =====================================

    const insights =
      completion
        .choices[0]
        ?.message
        ?.content;

    if (!insights) {
      return NextResponse.json(
        {
          error:
            "AI could not generate insights.",
        },
        {
          status: 500,
        }
      );
    }

    // =====================================
    // RETURN RESPONSE
    // =====================================

    return NextResponse.json({
      success: true,

      insights,

      businessData,
    });

  } catch (error: any) {
    console.error(
      "AI Insights Error:",
      error
    );

    // =====================================
    // OPENAI RATE LIMIT / QUOTA
    // =====================================

    if (
      error?.status === 429
    ) {
      return NextResponse.json(
        {
          error:
            "AI service is temporarily unavailable because the API quota or credits have been exhausted. Please add OpenAI API credits and try again.",
        },
        {
          status: 429,
        }
      );
    }

    // =====================================
    // OPENAI AUTH ERROR
    // =====================================

    if (
      error?.status === 401
    ) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is invalid or missing.",
        },
        {
          status: 500,
        }
      );
    }

    // =====================================
    // GENERAL ERROR
    // =====================================

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to generate AI insights.",
      },
      {
        status: 500,
      }
    );
  }
}