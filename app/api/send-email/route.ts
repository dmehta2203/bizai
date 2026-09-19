import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      to,
      subject,
      message,
      customerName,
    } = body;

    // ==========================
    // VALIDATION
    // ==========================

    if (!to) {
      return NextResponse.json(
        {
          error:
            "Customer email is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!subject) {
      return NextResponse.json(
        {
          error:
            "Email subject is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          error:
            "Email message is required.",
        },
        {
          status: 400,
        }
      );
    }

    // ==========================
    // SEND EMAIL
    // ==========================

    const { data, error } =
      await resend.emails.send({

        from:
          "BizAI Employee <onboarding@resend.dev>",

        to: [to],

        subject: subject,

        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: auto;
              padding: 30px;
              background: #ffffff;
              color: #1e293b;
            "
          >

            <h2
              style="
                color: #7c3aed;
              "
            >
              🤖 BizAI Employee
            </h2>

            <hr
              style="
                border: none;
                border-top: 1px solid #e2e8f0;
                margin: 20px 0;
              "
            />

            ${
              customerName
                ? `
                <p>
                  Hello <strong>${customerName}</strong>,
                </p>
                `
                : ""
            }

            <div
              style="
                white-space: pre-wrap;
                line-height: 1.7;
                font-size: 16px;
              "
            >
              ${message}
            </div>

            <br />

            <hr
              style="
                border: none;
                border-top: 1px solid #e2e8f0;
                margin: 20px 0;
              "
            />

            <p
              style="
                color: #64748b;
                font-size: 13px;
              "
            >
              Sent using BizAI Employee
            </p>

          </div>
        `,

      });

    // ==========================
    // RESEND ERROR
    // ==========================

    if (error) {

      console.error(
        "Resend Error:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Unable to send email.",
        },
        {
          status: 500,
        }
      );
    }

    // ==========================
    // SUCCESS
    // ==========================

    return NextResponse.json(
      {
        success: true,

        message:
          "Email sent successfully!",

        data,
      },
      {
        status: 200,
      }
    );

  } catch (error) {

    console.error(
      "Send Email Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while sending the email.",
      },
      {
        status: 500,
      }
    );
  }
}