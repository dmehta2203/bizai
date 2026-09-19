"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

import {
  getUserSubscription,
  hasFeatureAccess,
  getRequiredPlan,
  SubscriptionPlan,
} from "@/lib/subscription";

type SubscriptionGuardProps = {
  feature: string;

  children: React.ReactNode;
};

export default function SubscriptionGuard({
  feature,
  children,
}: SubscriptionGuardProps) {

  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [hasAccess, setHasAccess] =
    useState(false);

  const [plan, setPlan] =
    useState<SubscriptionPlan>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  // ==========================
  // CHECK SUBSCRIPTION ACCESS
  // ==========================

  async function checkAccess() {

    try {

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.user) {

        router.push("/login");

        return;
      }

      const userId =
        session.user.id;

      // ==========================
      // GET USER SUBSCRIPTION
      // ==========================

      const subscription =
        await getUserSubscription(
          userId
        );

      if (!subscription) {

        setHasAccess(false);

        setLoading(false);

        return;
      }

      setPlan(
        subscription.plan
      );

      // ==========================
      // CHECK FEATURE ACCESS
      // ==========================

      const access =
        hasFeatureAccess(
          subscription.plan,
          feature
        );

      setHasAccess(access);

    } catch (error) {

      console.error(
        "Subscription access error:",
        error
      );

      setHasAccess(false);

    }

    setLoading(false);
  }

  // ==========================
  // LOADING
  // ==========================

  if (loading) {

    return (

      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-4">
            🔐
          </div>

          <h2 className="text-xl font-semibold">
            Checking subscription...
          </h2>

          <p className="text-slate-400 mt-2">
            Please wait while we verify
            your plan access.
          </p>

        </div>

      </div>

    );
  }

  // ==========================
  // ACCESS GRANTED
  // ==========================

  if (hasAccess) {

    return (
      <>
        {children}
      </>
    );
  }

  // ==========================
  // FEATURE LOCKED
  // ==========================

  const requiredPlan =
    getRequiredPlan(feature);

  return (

    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

      <div className="max-w-lg w-full bg-slate-900 border border-purple-500/30 rounded-2xl p-8 text-center">

        <div className="text-6xl mb-5">
          🔒
        </div>

        <h1 className="text-3xl font-bold">
          Feature Locked
        </h1>

        <p className="text-slate-400 mt-4">

          This feature requires the{" "}

          <span className="text-purple-400 font-semibold">

            {requiredPlan} Plan

          </span>

          .

        </p>

        {plan && (

          <p className="text-slate-500 text-sm mt-3">

            Your current plan:{" "}

            <span className="text-white">

              {plan}

            </span>

          </p>

        )}

        <button
          onClick={() =>
            router.push("/pricing")
          }
          className="w-full mt-8 bg-purple-600 hover:bg-purple-700 py-3 rounded-xl font-semibold"
        >

          🚀 Upgrade Now

        </button>

        <button
          onClick={() =>
            router.push("/dashboard")
          }
          className="w-full mt-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 rounded-xl"
        >

          ← Back to Dashboard

        </button>

      </div>

    </div>

  );
}