"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type OwnerProtectedRouteProps = {
  children: React.ReactNode;
};

export default function OwnerProtectedRoute({
  children,
}: OwnerProtectedRouteProps) {

  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [isOwner, setIsOwner] =
    useState(false);


  useEffect(() => {

    checkOwner();

  }, []);


  // ==========================
  // CHECK OWNER ACCESS
  // ==========================

  async function checkOwner() {

    try {

      setLoading(true);


      // ==========================
      // GET CURRENT SESSION
      // ==========================

      const {
        data: {
          session,
        },
        error: sessionError,
      } =
        await supabase.auth.getSession();


      if (sessionError) {

        console.error(
          "Session error:",
          {
            message:
              sessionError.message,

            name:
              sessionError.name,
          }
        );

        router.replace("/login");

        return;
      }


      // ==========================
      // NOT LOGGED IN
      // ==========================

      if (!session?.user) {

        console.log(
          "No user session found."
        );

        router.replace("/login");

        return;
      }


      const userId =
        session.user.id;


      console.log(
        "Checking owner access for user:",
        userId
      );


      // ==========================
      // GET USER PROFILE
      // ==========================

      const {
        data: profile,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select(
            "id, role"
          )
          .eq(
            "id",
            userId
          )
          .maybeSingle();


      // ==========================
      // PROFILE ERROR
      // ==========================

      if (profileError) {

        console.error(
          "Owner profile check error:",
          {
            message:
              profileError.message,

            details:
              profileError.details,

            hint:
              profileError.hint,

            code:
              profileError.code,
          }
        );


        router.replace(
          "/dashboard"
        );

        return;
      }


      // ==========================
      // PROFILE NOT FOUND
      // ==========================

      if (!profile) {

        console.error(
          "Profile not found for user:",
          userId
        );


        router.replace(
          "/dashboard"
        );

        return;
      }


      console.log(
        "Profile found:",
        profile
      );


      // ==========================
      // CHECK OWNER ROLE
      // ==========================

      if (
        profile.role !== "owner"
      ) {

        console.log(
          "User is not an owner. Role:",
          profile.role
        );


        router.replace(
          "/dashboard"
        );

        return;
      }


      // ==========================
      // OWNER VERIFIED
      // ==========================

      console.log(
        "Owner access verified successfully."
      );


      setIsOwner(true);

    } catch (error: any) {

      console.error(
        "Owner protection error:",
        {
          message:
            error?.message,

          details:
            error?.details,

          hint:
            error?.hint,

          code:
            error?.code,
        }
      );


      router.replace(
        "/login"
      );

    } finally {

      setLoading(false);

    }

  }


  // ==========================
  // LOADING SCREEN
  // ==========================

  if (loading) {

    return (

      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-4 animate-pulse">
            👑
          </div>

          <h2 className="text-xl font-bold">
            Verifying Owner Access...
          </h2>

          <p className="text-slate-400 mt-2">
            Please wait while we secure your access.
          </p>

        </div>

      </main>

    );

  }


  // ==========================
  // BLOCK NON OWNER
  // ==========================

  if (!isOwner) {

    return null;

  }


  // ==========================
  // OWNER ACCESS
  // ==========================

  return (

    <>
      {children}
    </>

  );

}