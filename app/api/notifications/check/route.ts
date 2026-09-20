import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";

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

export async function POST(
  request: NextRequest
) {
  try {
    // ======================================
    // GET AUTHORIZATION HEADER
    // ======================================

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
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

    // ======================================
    // GET ACCESS TOKEN
    // ======================================

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

    // ======================================
    // VERIFY USER WITH SUPABASE
    // ======================================

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

    // ======================================
    // TRUST ONLY VERIFIED USER ID
    // ======================================

    const userId =
      authenticatedUser.id;

    // ======================================
    // RATE LIMIT
    // 10 REQUESTS / 60 SECONDS
    // ======================================

    const rateLimit =
      await checkRateLimit(
        userId,
        "/api/notifications/check",
        10,
        60
      );

    if (
      !rateLimit.allowed
    ) {
      console.warn(
        "Notification check rate limit triggered for user:",
        userId
      );

      return NextResponse.json(
        {
          error:
            rateLimit.error ||
            "Too many notification requests. Please wait a moment and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              "60",
          },
        }
      );
    }

    // ======================================
    // GET TODAY DATE
    // ======================================

    const today =
      new Date();

    const year =
      today.getFullYear();

    const month =
      String(
        today.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        today.getDate()
      ).padStart(
        2,
        "0"
      );

    const todayString =
      `${year}-${month}-${day}`;

    // ======================================
    // FETCH BUSINESS DATA
    // ======================================

    const [
      tasksResult,
      followUpsResult,
      salesResult,
      appointmentsResult,
      leadsResult,
    ] = await Promise.all([
      // ====================================
      // TASKS
      // ====================================

      supabase
        .from("tasks")
        .select("*")
        .eq(
          "user_id",
          userId
        ),

      // ====================================
      // FOLLOW UPS
      // ====================================

      supabase
        .from("follow_ups")
        .select("*")
        .eq(
          "user_id",
          userId
        ),

      // ====================================
      // SALES
      // ====================================

      supabase
        .from("sales")
        .select("*")
        .eq(
          "user_id",
          userId
        ),

      // ====================================
      // APPOINTMENTS
      // ====================================

      supabase
        .from("appointments")
        .select("*")
        .eq(
          "user_id",
          userId
        ),

      // ====================================
      // LEADS
      // ====================================

      supabase
        .from("leads")
        .select("*")
        .eq(
          "user_id",
          userId
        ),
    ]);

    // ======================================
    // CHECK DATABASE READ ERRORS
    // ======================================

    const databaseReadError =
      tasksResult.error ||
      followUpsResult.error ||
      salesResult.error ||
      appointmentsResult.error ||
      leadsResult.error;

    if (
      databaseReadError
    ) {
      console.error(
        "Notification data error:",
        databaseReadError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load notification data.",
        },
        {
          status: 500,
        }
      );
    }

    // ======================================
    // GET DATA
    // ======================================

    const tasks =
      tasksResult.data || [];

    const followUps =
      followUpsResult.data || [];

    const sales =
      salesResult.data || [];

    const appointments =
      appointmentsResult.data || [];

    const leads =
      leadsResult.data || [];

    // ======================================
    // CREATE NOTIFICATION HELPER
    // ======================================

    async function createNotification(
      title: string,
      message: string,
      type: string
    ) {
      // ====================================
      // CHECK DUPLICATE
      // ====================================

      const {
        data: existing,
        error:
          duplicateError,
      } =
        await supabase
          .from("notifications")
          .select("id")
          .eq(
            "user_id",
            userId
          )
          .eq(
            "title",
            title
          )
          .eq(
            "message",
            message
          )
          .eq(
            "is_read",
            false
          )
          .maybeSingle();

      if (
        duplicateError
      ) {
        console.error(
          "Notification duplicate check error:",
          duplicateError
        );

        return;
      }

      // ====================================
      // DON'T CREATE DUPLICATE
      // ====================================

      if (existing) {
        return;
      }

      // ====================================
      // CREATE NOTIFICATION
      // ====================================

      const {
        error:
          insertError,
      } =
        await supabase
          .from("notifications")
          .insert({
            user_id:
              userId,

            title:
              title,

            message:
              message,

            type:
              type,

            is_read:
              false,
          });

      if (
        insertError
      ) {
        console.error(
          "Notification insert error:",
          insertError
        );
      }
    }

    // ======================================
    // CHECK OVERDUE TASKS
    // ======================================

    const overdueTasks =
      tasks.filter(
        (task: any) => {
          if (
            task.status ===
              "Completed" ||
            !task.due_date
          ) {
            return false;
          }

          return (
            task.due_date <
            todayString
          );
        }
      );

    if (
      overdueTasks.length >
      0
    ) {
      await createNotification(
        "Overdue Tasks",
        `You have ${overdueTasks.length} overdue task(s). Complete them as soon as possible.`,
        "danger"
      );
    }

    // ======================================
    // CHECK TASKS DUE TODAY
    // ======================================

    const tasksToday =
      tasks.filter(
        (task: any) =>
          task.status !==
            "Completed" &&
          task.due_date ===
            todayString
      );

    if (
      tasksToday.length >
      0
    ) {
      await createNotification(
        "Tasks Due Today",
        `You have ${tasksToday.length} task(s) due today.`,
        "warning"
      );
    }

    // ======================================
    // CHECK OVERDUE FOLLOW UPS
    // ======================================

    const overdueFollowUps =
      followUps.filter(
        (followUp: any) =>
          !followUp.completed &&
          followUp.due_date <
            todayString
      );

    if (
      overdueFollowUps.length >
      0
    ) {
      await createNotification(
        "Overdue Follow-ups",
        `You have ${overdueFollowUps.length} overdue follow-up(s). Contact your leads immediately.`,
        "danger"
      );
    }

    // ======================================
    // CHECK FOLLOW UPS TODAY
    // ======================================

    const followUpsToday =
      followUps.filter(
        (followUp: any) =>
          !followUp.completed &&
          followUp.due_date ===
            todayString
      );

    if (
      followUpsToday.length >
      0
    ) {
      await createNotification(
        "Follow-ups Due Today",
        `You have ${followUpsToday.length} follow-up(s) scheduled for today.`,
        "warning"
      );
    }

    // ======================================
    // CHECK PENDING PAYMENTS
    // ======================================

    const pendingPayments =
      sales.filter(
        (sale: any) =>
          sale.payment_status ===
          "Pending"
      );

    const pendingAmount =
      pendingPayments.reduce(
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

    if (
      pendingAmount >
      0
    ) {
      await createNotification(
        "Pending Payments",
        `₹${pendingAmount.toLocaleString(
          "en-IN"
        )} payment is still pending.`,
        "warning"
      );
    }

    // ======================================
    // CHECK APPOINTMENTS TODAY
    // ======================================

    const appointmentsToday =
      appointments.filter(
        (appointment: any) =>
          appointment.appointment_date ===
          todayString
      );

    if (
      appointmentsToday.length >
      0
    ) {
      await createNotification(
        "Appointments Today",
        `You have ${appointmentsToday.length} appointment(s) scheduled for today.`,
        "info"
      );
    }

    // ======================================
    // CHECK HIGH PRIORITY LEADS
    // ======================================

    const priorityLeads =
      leads.filter(
        (lead: any) =>
          lead.status ===
            "Interested" ||
          lead.status ===
            "Negotiation"
      );

    if (
      priorityLeads.length >
      0
    ) {
      await createNotification(
        "High Priority Leads",
        `You have ${priorityLeads.length} interested or negotiation lead(s) that need attention.`,
        "success"
      );
    }

    // ======================================
    // RETURN SUCCESS
    // ======================================

    return NextResponse.json({
      success:
        true,

      message:
        "Notifications checked successfully.",

      summary: {
        overdueTasks:
          overdueTasks.length,

        tasksToday:
          tasksToday.length,

        overdueFollowUps:
          overdueFollowUps.length,

        followUpsToday:
          followUpsToday.length,

        pendingPayments:
          pendingPayments.length,

        pendingAmount:
          pendingAmount,

        appointmentsToday:
          appointmentsToday.length,

        priorityLeads:
          priorityLeads.length,
      },
    });

  } catch (
    error: any
  ) {
    console.error(
      "Notification API Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}