"use client";

import Link from "next/link";

export default function Home() {
  const features = [
    {
      icon: "🤖",
      title: "AI Assistant",
      description:
        "Automatically answer customer questions 24/7.",
      href: "/assistant",
    },
    {
      icon: "🔥",
      title: "Smart Leads",
      description:
        "Track and identify your most interested customers.",
      href: "/leads",
    },
    {
      icon: "📅",
      title: "Appointments",
      description:
        "Automatically manage bookings and appointments.",
      href: "/appointments",
    },
    {
      icon: "💬",
      title: "Customer Chat",
      description:
        "Manage all customer conversations in one place.",
      href: "/chat",
    },
    {
      icon: "📊",
      title: "Analytics",
      description:
        "Understand your customers and grow your business.",
      href: "/analytics",
    },
    {
      icon: "⚡",
      title: "Automation",
      description:
        "Save time with smart automatic follow-ups.",
      href: "/automation",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* NAVBAR */}

      <nav className="flex items-center justify-between px-6 py-5 md:px-16">

        <div className="text-2xl font-bold">
          Biz
          <span className="text-blue-500">
            AI
          </span>
        </div>


        <div className="flex gap-4">

          <Link
            href="/login"
            className="rounded-lg px-4 py-2 hover:bg-slate-800"
          >
            Login
          </Link>


          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-5 py-2 font-semibold hover:bg-blue-700"
          >
            Get Started
          </Link>

        </div>

      </nav>


      {/* HERO */}

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">

        <div className="mb-6 inline-block rounded-full bg-blue-500/10 px-4 py-2 text-sm text-blue-400">

          🚀 AI-Powered Business Assistant

        </div>


        <h1 className="mb-6 text-5xl font-bold leading-tight md:text-7xl">

          Your AI Employee That

          <br />

          <span className="text-blue-500">

            Never Sleeps.

          </span>

        </h1>


        <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400">

          BizAI helps Indian businesses automatically respond
          to customers, manage leads, book appointments and
          grow their business using AI.

        </p>


        <div className="flex flex-col justify-center gap-4 sm:flex-row">


          {/* START FREE */}

          <Link
            href="/signup"
            className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold hover:bg-blue-700"
          >

            Start For Free 🚀

          </Link>


          {/* EXPLORE FEATURES */}

          <a
            href="#features"
            className="rounded-xl border border-slate-700 px-8 py-4 text-lg hover:bg-slate-900"
          >

            Explore Features

          </a>


        </div>

      </section>


      {/* FEATURES */}

      <section
        id="features"
        className="bg-slate-900 px-6 py-20"
      >

        <h2 className="mb-4 text-center text-4xl font-bold">

          Everything Your Business Needs

        </h2>


        <p className="mx-auto mb-14 max-w-xl text-center text-slate-400">

          Powerful tools designed to help your
          business save time, manage customers
          and grow faster.

        </p>


        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">


          {features.map((feature) => (

            <Link
              key={feature.title}
              href={feature.href}
              className="group rounded-2xl border border-slate-800 bg-slate-950 p-7 transition duration-300 hover:-translate-y-2 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10"
            >

              <div className="mb-4 text-4xl transition duration-300 group-hover:scale-110">

                {feature.icon}

              </div>


              <h3 className="mb-3 text-xl font-bold group-hover:text-blue-400">

                {feature.title}

              </h3>


              <p className="text-slate-400">

                {feature.description}

              </p>


              <div className="mt-5 font-semibold text-blue-400 opacity-0 transition duration-300 group-hover:opacity-100">

                Explore →

              </div>

            </Link>

          ))}

        </div>

      </section>


      {/* HOW IT WORKS */}

      <section className="mx-auto max-w-6xl px-6 py-24">

        <h2 className="mb-14 text-center text-4xl font-bold">

          How BizAI Works

        </h2>


        <div className="grid gap-8 md:grid-cols-3">


          <div className="text-center">

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold">

              1

            </div>


            <h3 className="text-xl font-bold">

              Create Your Account

            </h3>


            <p className="mt-3 text-slate-400">

              Sign up and set up your business
              in just a few minutes.

            </p>

          </div>


          <div className="text-center">

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold">

              2

            </div>


            <h3 className="text-xl font-bold">

              Add Your Business Data

            </h3>


            <p className="mt-3 text-slate-400">

              Add leads, customers, tasks and
              sales to your BizAI dashboard.

            </p>

          </div>


          <div className="text-center">

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold">

              3

            </div>


            <h3 className="text-xl font-bold">

              Let BizAI Help You

            </h3>


            <p className="mt-3 text-slate-400">

              Get smart insights, manage your
              business and grow faster.

            </p>

          </div>

        </div>

      </section>


      {/* CTA */}

      <section className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-slate-950 px-6 py-24 text-center">

        <h2 className="mb-5 text-4xl font-bold">

          Ready to Grow Your Business?

        </h2>


        <p className="mb-8 text-slate-400">

          Let AI handle your business operations
          while you focus on growth.

        </p>


        <Link
          href="/signup"
          className="inline-block rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold hover:bg-blue-700"
        >

          Get Started Free 🚀

        </Link>

      </section>


      {/* FOOTER */}

      <footer className="border-t border-slate-800 px-6 py-8 text-center text-slate-500">

        © 2026 BizAI India. Built for Indian Businesses 🇮🇳

      </footer>

    </main>
  );
}