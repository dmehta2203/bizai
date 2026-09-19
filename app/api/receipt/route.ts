import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    return NextResponse.json({
      success: true,
      message:
        "Receipt endpoint is available.",
      data: body,
    });
  } catch (error) {
    console.error(
      "Receipt API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid receipt request.",
      },
      {
        status: 400,
      }
    );
  }
}