"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
  getUserPlan,
  getRequiredPlan,
  SubscriptionPlan,
} from "@/lib/subscription";

type FeatureGuardProps = {
  feature: string;
  children: React.ReactNode;
};

export default function FeatureGuard({
  feature,
  children,
}: FeatureGuardProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [hasAccess, setHasAccess] =
    useState(false);

  const [userPlan, setUserPlan] =
    useState<SubscriptionPlan>(null);

  const [requiredPlan, setRequiredPlan] =
    useState("Professional");

  // =====================================
  // CHECK FEATURE ACCESS
  // =====================================

  useEffect(() => {
    let isMounted = true;

    async function checkFeatureAccess() {
      try {
        setLoading(true);

        // =====================================
        // GET LOGGED-IN USER
        // =====================================

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "Session error:",
            sessionError
          );

          if (isMounted) {
            setHasAccess(false);
          }

          return;
        }

        // =====================================
        // USER NOT LOGGED IN
        // ProtectedLayout handles login redirect
        // =====================================

        if (!session?.user) {
          if (isMounted) {
            setHasAccess(false);
          }

          return;
        }

        // =====================================
        // GET USER PLAN
        // =====================================

        const plan = await getUserPlan(
          session.user.id
        );

        // =====================================
        // GET REQUIRED PLAN
        // =====================================

        const required =
          getRequiredPlan(feature);

        // =====================================
        // PLAN LEVELS
        // =====================================

        const planLevels: Record<
          string,
          number
        > = {
          Starter: 1,
          Professional: 2,
          Business: 3,
        };

        // =====================================
        // NORMALIZE PLAN NAME
        // =====================================

        const normalizedPlan = plan
          ? plan.charAt(0).toUpperCase() +
            plan.slice(1).toLowerCase()
          : "";

        // =====================================
        // NORMALIZE REQUIRED PLAN
        // =====================================

        const normalizedRequiredPlan =
          required
            ? required
                .charAt(0)
                .toUpperCase() +
              required
                .slice(1)
                .toLowerCase()
            : "";

        // =====================================
        // GET PLAN LEVELS
        // =====================================

        const currentPlanLevel =
          planLevels[normalizedPlan] || 0;

        const requiredPlanLevel =
          planLevels[
            normalizedRequiredPlan
          ] || 0;

        // =====================================
        // CHECK ACCESS
        // =====================================

        const allowed =
          currentPlanLevel >=
          requiredPlanLevel;

        console.log(
          "=========================="
        );

        console.log(
          "Feature:",
          feature
        );

        console.log(
          "Current Plan:",
          normalizedPlan || "Free"
        );

        console.log(
          "Required Plan:",
          normalizedRequiredPlan
        );

        console.log(
          "Current Plan Level:",
          currentPlanLevel
        );

        console.log(
          "Required Plan Level:",
          requiredPlanLevel
        );

        console.log(
          "Has Access:",
          allowed
        );

        console.log(
          "=========================="
        );

        // =====================================
        // UPDATE STATE
        // =====================================

        if (isMounted) {
          setUserPlan(plan);

          setRequiredPlan(required);

          setHasAccess(allowed);
        }

      } catch (error) {

        console.error(
          "Feature access error:",
          error
        );

        if (isMounted) {
          setHasAccess(false);
        }

      } finally {

        if (isMounted) {
          setLoading(false);
        }

      }
    }

    checkFeatureAccess();

    return () => {
      isMounted = false;
    };

  }, [feature]);

  // =====================================
  // LOADING
  // =====================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl animate-pulse">
            🔐
          </div>

          <p className="text-slate-400 mt-4">
            Checking feature access...
          </p>

        </div>

      </div>
    );
  }

  // =====================================
  // USER HAS ACCESS
  // =====================================

  if (hasAccess) {
    return <>{children}</>;
  }

  // =====================================
  // ACCESS DENIED
  // =====================================

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">

        {/* LOCK ICON */}

        <div className="text-6xl mb-5">
          🔒
        </div>

        {/* TITLE */}

        <h1 className="text-2xl font-bold">
          Feature Locked
        </h1>

        {/* DESCRIPTION */}

        <p className="text-slate-400 mt-4">
          This feature is not available
          in your current plan.
        </p>

        {/* CURRENT PLAN */}

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mt-6">

          <p className="text-sm text-slate-400">
            Your Current Plan
          </p>

          <p className="text-xl font-bold text-blue-400 mt-1">

            {userPlan || "Free"}

          </p>

        </div>

        {/* REQUIRED PLAN */}

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mt-4">

          <p className="text-sm text-slate-400">
            Required Plan
          </p>

          <p className="text-xl font-bold text-purple-400 mt-1">

            {requiredPlan}

          </p>

        </div>

        {/* UPGRADE BUTTON */}

        <button
          onClick={() => {
            router.push("/pricing");
          }}
          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 px-5 py-3 rounded-xl font-semibold transition"
        >

          🚀 Upgrade Plan

        </button>

        {/* DASHBOARD BUTTON */}

        <button
          onClick={() => {
            router.push("/dashboard");
          }}
          className="w-full mt-3 bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl transition"
        >

          🏠 Back to Dashboard

        </button>

      </div>

    </div>
  );
}