"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getCurrentPlan,
} from "@/lib/subscription";

import {
  checkFeatureAccess,
  getRequiredPlan,
  type FeatureName,
  type PlanName,
} from "@/lib/feature";

// ========================================
// TYPES
// ========================================

type FeatureAccessProps = {
  feature: FeatureName;
  children: React.ReactNode;
};

// ========================================
// COMPONENT
// ========================================

export default function FeatureAccess({
  feature,
  children,
}: FeatureAccessProps) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [hasAccess, setHasAccess] =
    useState(false);

  const [requiredPlan, setRequiredPlan] =
    useState<PlanName | null>(null);

  // ========================================
  // CHECK FEATURE ACCESS
  // ========================================

  useEffect(() => {
    async function checkAccess() {
      try {
        setLoading(true);

        // GET USER PLAN
        const currentPlan =
          await getCurrentPlan();

        // GET REQUIRED PLAN
        const required =
          getRequiredPlan(feature);

        setRequiredPlan(required);

        // CHECK ACCESS
        const allowed =
          checkFeatureAccess(
            currentPlan,
            feature
          );

        setHasAccess(allowed);
      } catch (error) {
        console.error(
          "Feature access error:",
          error
        );

        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [feature]);

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl animate-pulse mb-5">
            🔐
          </div>

          <h2 className="text-xl font-semibold">
            Checking feature access...
          </h2>

          <p className="text-slate-400 mt-2">
            Please wait.
          </p>
        </div>
      </main>
    );
  }

  // ========================================
  // NO ACCESS
  // ========================================

  if (!hasAccess) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-slate-900 border border-purple-500/30 rounded-3xl p-8 md:p-10 text-center">
          <div className="text-6xl">
            🔒
          </div>

          <h1 className="text-3xl font-bold mt-6">
            Premium Feature
          </h1>

          <p className="text-slate-400 mt-4">
            This feature requires the{" "}

            <span className="text-purple-400 font-semibold">
              {requiredPlan}
            </span>

            {" "}plan or higher.
          </p>

          <button
            onClick={() =>
              router.push("/pricing")
            }
            className="mt-8 w-full bg-purple-600 hover:bg-purple-700 py-4 rounded-xl font-semibold transition"
          >
            🚀 View Pricing Plans
          </button>

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="mt-3 w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-xl font-semibold transition"
          >
            🏠 Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // ========================================
  // ACCESS ALLOWED
  // ========================================

  return <>{children}</>;
}