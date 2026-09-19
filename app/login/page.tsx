"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {

      // ==========================
      // LOGIN USER
      // ==========================

      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });


      if (error) {
        setMessage(error.message);
        return;
      }


      // ==========================
      // GET LOGGED IN USER
      // ==========================

      const user = data.user;


      if (!user) {

        setMessage(
          "Unable to get user information."
        );

        return;
      }


      // ==========================
      // CHECK USER ROLE
      // ==========================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();


      if (profileError) {

        console.error(
          "Profile check error:",
          profileError
        );

      }


      // ==========================
      // OWNER LOGIN
      // ==========================

      if (
        profile?.role
          ?.toLowerCase() === "owner"
      ) {

        router.replace(
          "/owner/dashboard"
        );

        return;

      }


      // ==========================
      // NORMAL USER LOGIN
      // ==========================

      router.replace(
        "/dashboard"
      );

    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      setMessage(
        "Something went wrong. Please try again."
      );

    } finally {

      setLoading(false);

    }

  }


  return (

    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">

      <div className="w-full max-w-md">


        {/* ========================== */}
        {/* LOGO */}
        {/* ========================== */}

        <Link
          href="/"
          className="mb-8 block text-center text-3xl font-bold"
        >

          Biz
          <span className="text-blue-500">
            AI
          </span>

        </Link>


        {/* ========================== */}
        {/* LOGIN CARD */}
        {/* ========================== */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">


          <h1 className="mb-2 text-3xl font-bold">

            Welcome Back 👋

          </h1>


          <p className="mb-8 text-slate-400">

            Login to manage your business with AI.

          </p>


          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >


            {/* EMAIL */}

            <div>

              <label className="mb-2 block text-sm font-medium">

                Email Address

              </label>


              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
              />

            </div>


            {/* PASSWORD */}

            <div>

              <label className="mb-2 block text-sm font-medium">

                Password

              </label>


              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
              />

            </div>


            {/* FORGOT PASSWORD */}

            <div className="text-right">

              <button
                type="button"
                className="text-sm text-blue-400 hover:text-blue-300"
              >

                Forgot Password?

              </button>

            </div>


            {/* MESSAGE */}

            {message && (

              <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">

                {message}

              </div>

            )}


            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {loading
                ? "Logging in..."
                : "Login"}

            </button>


          </form>


          {/* SIGNUP LINK */}

          <p className="mt-6 text-center text-sm text-slate-400">

            Don't have an account?{" "}

            <Link
              href="/signup"
              className="font-medium text-blue-400 hover:text-blue-300"
            >

              Create Account

            </Link>

          </p>


        </div>

      </div>

    </main>

  );
}