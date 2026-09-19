import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      customerName,
      businessName,
      purpose,
    } = body;

    if (!customerName) {
      return NextResponse.json(
        {
          error: "Customer name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!purpose?.trim()) {
      return NextResponse.json(
        {
          error: "Email purpose is required.",
        },
        {
          status: 400,
        }
      );
    }

    const response =
      await openai.responses.create({
        model: "gpt-5.6-luna",

        instructions: `
You are BizAI Employee, an intelligent AI business assistant
for Indian businesses.

Write a professional, friendly and concise business email.

Rules:
- Write only the email content.
- Do not include a subject line.
- Address the customer naturally.
- Keep the email professional and easy to understand.
- Do not use markdown.
- End with a professional closing.
        `,

        input: `
Customer Name: ${customerName}

Customer Business: ${
          businessName || "Not provided"
        }

Purpose of Email:
${purpose}
        `,
      });

    return NextResponse.json({
      message: response.output_text,
    });

  } catch (error) {
    console.error(
      "AI Email Generation Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to generate email.",
      },
      {
        status: 500,
      }
    );
  }
}