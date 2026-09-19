import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const phone = String(
      body?.phone || ""
    ).replace(/\D/g, "");

    const message = String(
      body?.message || ""
    );

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Phone number is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Message is required.",
        },
        {
          status: 400,
        }
      );
    }

    let normalizedPhone = phone;

    if (normalizedPhone.startsWith("0")) {
      normalizedPhone =
        normalizedPhone.substring(1);
    }

    if (
      normalizedPhone.length === 10
    ) {
      normalizedPhone =
        "91" + normalizedPhone;
    }

    const whatsappUrl =
      `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(
        message
      )}`;

    return NextResponse.json({
      success: true,
      whatsappUrl,
    });
  } catch (error) {
    console.error(
      "WhatsApp API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid WhatsApp request.",
      },
      {
        status: 400,
      }
    );
  }
}