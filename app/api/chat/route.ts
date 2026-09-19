import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      message,
      businessData,
      followUpLead,
    } = body;

    // =========================
    // AI FOLLOW-UP MESSAGE
    // =========================

    if (followUpLead) {
      const prompt = `
Generate a professional and friendly follow-up message for this business lead.

Lead Name: ${followUpLead.name}
Lead Status: ${followUpLead.status}
Follow-up Priority:
${followUpLead.follow_up_priority || "Medium"}

Follow-up Notes:
${followUpLead.follow_up_notes || "No notes available"}

Rules:
- Write a short WhatsApp-friendly message.
- Be professional and friendly.
- Use the lead's first name.
- Suitable for an Indian business.
- Do not use placeholders.
- Keep it under 100 words.
- Return only the message.
`;

      const response =
        await openai.responses.create({
          model: "gpt-5.6-luna",

          instructions: `
You are BizAI Employee, an AI assistant
helping Indian businesses communicate
professionally with leads.
`,

          input: prompt,
        });

      return NextResponse.json({
        reply: response.output_text,
      });
    }

    // =========================
    // NORMAL AI CHAT
    // =========================

    if (
      !message ||
      typeof message !== "string"
    ) {
      return NextResponse.json(
        {
          error: "Message is required.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================
    // GET BUSINESS DATA
    // =========================

    const customers =
      businessData?.customers || [];

    const leads =
      businessData?.leads || [];

    const appointments =
      businessData?.appointments || [];

    const tasks =
      businessData?.tasks || [];

    const sales =
      businessData?.sales || [];

    const followUps =
      businessData?.followUps || [];

    // =========================
    // BUSINESS SUMMARY
    // =========================

    const summary =
      businessData?.summary || {};

    // =========================
    // BUSINESS CONTEXT
    // =========================

    const businessContext = `

BUSINESS DATA FOR THIS USER:

=========================

LEADS

Total Leads:
${summary.totalLeads ?? leads.length}

New Leads:
${summary.newLeads ?? 0}

Contacted Leads:
${summary.contactedLeads ?? 0}

Interested Leads:
${summary.interestedLeads ?? 0}

Negotiation Leads:
${summary.negotiationLeads ?? 0}

Converted Leads:
${summary.convertedLeads ?? 0}


=========================

CUSTOMERS

Total Customers:
${summary.totalCustomers ?? customers.length}


=========================

TASKS

Total Tasks:
${summary.totalTasks ?? tasks.length}

Pending Tasks:
${summary.pendingTasks ?? 0}

Completed Tasks:
${summary.completedTasks ?? 0}

Overdue Tasks:
${summary.overdueTasks ?? 0}


=========================

SALES

Total Sales:
${summary.totalSales ?? sales.length}

Total Revenue:
₹${summary.totalRevenue ?? 0}

Paid Revenue:
₹${summary.paidRevenue ?? 0}

Pending Revenue:
₹${summary.pendingRevenue ?? 0}


=========================

FOLLOW-UPS

Pending Follow-ups:
${summary.pendingFollowUps ?? 0}


=========================

CUSTOMER DETAILS

${JSON.stringify(customers, null, 2)}


=========================

LEAD DETAILS

${JSON.stringify(leads, null, 2)}


=========================

TASK DETAILS

${JSON.stringify(tasks, null, 2)}


=========================

SALES DETAILS

${JSON.stringify(sales, null, 2)}


=========================

FOLLOW-UP DETAILS

${JSON.stringify(followUps, null, 2)}


=========================

APPOINTMENTS

${JSON.stringify(
  appointments,
  null,
  2
)}

`;

    // =========================
    // OPENAI RESPONSE
    // =========================

    const response =
      await openai.responses.create({
        model: "gpt-5.6-luna",

        instructions: `

You are BizAI Employee, an intelligent
AI business assistant for Indian businesses.

You have access to the user's REAL
business data below.

${businessContext}

IMPORTANT RULES:

1. Always use the real business data
when answering questions about the
business.

2. Never invent business numbers.

3. If information is not available,
clearly say that the data is not
available.

4. Give practical and useful advice.

5. Be friendly and conversational.

6. Give advice suitable for Indian
small and medium businesses.

7. Use ₹ for money.

8. Keep answers concise but helpful.

9. Use bullet points when useful.

10. When analyzing the business,
identify problems AND give clear
actionable recommendations.

11. Prioritize:
- Interested leads
- Negotiation leads
- Overdue tasks
- Pending follow-ups
- Pending payments

12. If the user asks for business
performance, analyze:
- Leads
- Customers
- Tasks
- Sales
- Revenue
- Follow-ups

13. Act like a smart business
consultant helping the owner grow
their business.

`,

        input: message,
      });

    return NextResponse.json({
      reply: response.output_text,
    });

  } catch (error: any) {

    console.error(
      "OpenAI API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Something went wrong while contacting BizAI.",
      },
      {
        status: 500,
      }
    );
  }
}