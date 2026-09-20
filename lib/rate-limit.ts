import { createClient } from "@supabase/supabase-js";

// =========================================================
// SUPABASE SERVER CLIENT
// =========================================================

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

// =========================================================
// CREATE SERVER CLIENT
// =========================================================

function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing."
    );
  }

  if (!supabaseServiceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// =========================================================
// RATE LIMIT RESULT
// =========================================================

export type RateLimitResult = {
  allowed: boolean;
  error?: string;
};

// =========================================================
// CHECK RATE LIMIT
// =========================================================

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    // =======================================================
    // BASIC VALIDATION
    // =======================================================

    if (!userId) {
      return {
        allowed: false,
        error: "User ID is required.",
      };
    }

    if (!endpoint) {
      return {
        allowed: false,
        error: "Endpoint is required.",
      };
    }

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 1000
    ) {
      return {
        allowed: false,
        error: "Invalid rate limit.",
      };
    }

    if (
      !Number.isInteger(windowSeconds) ||
      windowSeconds < 1 ||
      windowSeconds > 3600
    ) {
      return {
        allowed: false,
        error: "Invalid rate-limit window.",
      };
    }

    // =======================================================
    // SERVER-ONLY SUPABASE CLIENT
    // =======================================================

    const supabase =
      getSupabaseAdmin();

    // =======================================================
    // CALL DATABASE RATE LIMIT FUNCTION
    // =======================================================

    const {
      data,
      error,
    } = await supabase.rpc(
      "check_api_rate_limit",
      {
        p_user_id: userId,
        p_endpoint: endpoint,
        p_limit: limit,
        p_window_seconds:
          windowSeconds,
      }
    );

    // =======================================================
    // DATABASE ERROR
    // =======================================================

    if (error) {
      console.error(
        "Rate limit database error:",
        error.message
      );

      // Fail closed for security.
      return {
        allowed: false,
        error:
          "Unable to verify rate limit.",
      };
    }

    // =======================================================
    // RESULT
    // =======================================================

    return {
      allowed: data === true,
    };
  } catch (error) {
    console.error(
      "Rate limit unexpected error:",
      error
    );

    // Fail closed.
    return {
      allowed: false,
      error:
        "Unable to verify rate limit.",
    };
  }
}