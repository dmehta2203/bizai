"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {

      // ==========================
      // CREATE AUTH ACCOUNT
      // ==========================

      const {
        data,
        error,
      } = await supabase.auth.signUp({
        email,
        password,

        options: {
          data: {
            full_name: name,
          },
        },
      });


      if (error) {
        throw error;
      }


      // ==========================
      // CHECK USER CREATED
      // ==========================

      if (!data.user) {
        throw new Error(
          "Unable to create user account."
        );
      }


      // ==========================
      // CREATE PROFILE
      // ==========================

      const {
        error: profileError,
      } = await supabase
        .from("profiles")
        .insert({
          id: data.user.id,
          full_name: name,
          email: email,
          role: "user",
        });


      if (profileError) {

        console.error(
          "Profile creation error:",
          profileError
        );

      }


      // ==========================
      // SUCCESS
      // ==========================

      if (data.session) {

        setMessage(
          "Account created successfully! Redirecting..."
        );

        setTimeout(() => {

          router.push("/dashboard");

        }, 1000);

      } else {

        setMessage(
          "Account created successfully! Please check your email to confirm your account."
        );

      }

    } catch (error: any) {

      console.error(
        "Signup error:",
        error
      );

      setMessage(
        error.message ||
        "Something went wrong while creating your account."
      );

    } finally {

      setLoading(false);

    }
  }


  return (

    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-white">

      <div className="w-full max-w-md">

        {/* LOGO */}

        <Link
          href="/"
          className="mb-8 block text-center text-3xl font-bold"
        >

          Biz
          <span className="text-blue-500">
            AI
          </span>

        </Link>


        {/* SIGNUP CARD */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">

          <h1 className="mb-2 text-3xl font-bold">

            Create Your Account 🚀

          </h1>


          <p className="mb-8 text-slate-400">

            Start growing your business with AI.

          </p>


          <form
            onSubmit={handleSignup}
            className="space-y-5"
          >


            {/* NAME */}

            <div>

              <label className="mb-2 block text-sm font-medium">

                Full Name

              </label>


              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
              />

            </div>


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
                placeholder="Create a password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
              />

            </div>


            {/* MESSAGE */}

            {message && (

              <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">

                {message}

              </div>

            )}


            {/* SIGNUP BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {loading
                ? "Creating Account..."
                : "Create Account 🚀"}

            </button>

          </form>


          {/* LOGIN */}

          <p className="mt-6 text-center text-sm text-slate-400">

            Already have an account?{" "}

            <Link
              href="/login"
              className="font-medium text-blue-400 hover:text-blue-300"
            >

              Login

            </Link>

          </p>

        </div>

      </div>

    </main>

  );
}