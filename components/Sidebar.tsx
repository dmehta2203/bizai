"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const menuItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "🏠",
  },
  {
    name: "Customers",
    href: "/customers",
    icon: "👥",
  },
  {
    name: "Leads",
    href: "/leads",
    icon: "🎯",
  },
  {
    name: "Tasks",
    href: "/tasks",
    icon: "📋",
  },
  {
    name: "Follow-ups",
    href: "/follow-ups",
    icon: "📞",
  },
  {
    name: "Appointments",
    href: "/appointments",
    icon: "📅",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: "📊",
  },
  {
    name: "Business Report",
    href: "/business-report",
    icon: "📈",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  // =============================
  // NOTIFICATIONS
  // =============================

  const [unreadCount, setUnreadCount] =
    useState(0);

  // =============================
  // SALES DROPDOWN
  // =============================

  const [salesOpen, setSalesOpen] =
    useState(
      pathname === "/sales" ||
      pathname === "/sales-analytics"
    );

  // =============================
  // SUBSCRIPTION DROPDOWN
  // =============================

  const [
    subscriptionOpen,
    setSubscriptionOpen,
  ] = useState(
    pathname === "/pricing" ||
    pathname === "/subscription"
  );

  // =============================
  // LOAD NOTIFICATIONS
  // =============================

  useEffect(() => {
    loadUnreadNotifications();
  }, []);

  async function loadUnreadNotifications() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return;

    const { count, error } =
      await supabase
        .from("notifications")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "user_id",
          session.user.id
        )
        .eq(
          "is_read",
          false
        );

    if (!error) {
      setUnreadCount(count || 0);
    }
  }

  // =============================
  // LOGOUT
  // =============================

  async function handleLogout() {
    await supabase.auth.signOut();

    window.location.href = "/";
  }

  // =============================
  // ACTIVE STATES
  // =============================

  const isSalesActive =
    pathname === "/sales" ||
    pathname === "/sales-analytics";

  const isSubscriptionActive =
    pathname === "/pricing" ||
    pathname === "/subscription";

  return (
    <aside className="w-full md:w-64 md:min-h-screen bg-slate-900 border-r border-slate-800 p-5">

      {/* ============================= */}
      {/* LOGO */}
      {/* ============================= */}

      <div className="mb-10">

        <Link
          href="/dashboard"
          className="text-3xl font-bold"
        >
          Biz
          <span className="text-blue-500">
            AI
          </span>
        </Link>

        <p className="text-slate-400 text-sm mt-2">
          Your AI Business Assistant
        </p>

      </div>


      {/* ============================= */}
      {/* NOTIFICATIONS */}
      {/* ============================= */}

      <Link
        href="/notifications"
        className={`flex items-center justify-between px-4 py-3 mb-6 rounded-xl transition ${
          pathname === "/notifications"
            ? "bg-purple-600 text-white"
            : "bg-slate-800 hover:bg-slate-700"
        }`}
      >

        <div className="flex items-center gap-3">

          <span className="text-xl">
            🔔
          </span>

          <span>
            Notifications
          </span>

        </div>


        {unreadCount > 0 && (

          <span className="bg-red-500 text-white text-xs min-w-6 h-6 flex items-center justify-center px-2 rounded-full">

            {unreadCount}

          </span>

        )}

      </Link>


      {/* ============================= */}
      {/* MENU */}
      {/* ============================= */}

      <nav className="space-y-2">


        {/* ============================= */}
        {/* FIRST MENU ITEMS */}
        {/* ============================= */}

        {menuItems.slice(0, 6).map((item) => {

          const isActive =
            pathname === item.href;

          return (

            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >

              <span className="text-xl">
                {item.icon}
              </span>

              <span>
                {item.name}
              </span>

            </Link>

          );

        })}


        {/* ============================= */}
        {/* SALES DROPDOWN */}
        {/* ============================= */}

        <div>

          <button
            onClick={() =>
              setSalesOpen(!salesOpen)
            }
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
              isSalesActive
                ? "bg-green-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >

            <div className="flex items-center gap-3">

              <span className="text-xl">
                💰
              </span>

              <span>
                Sales
              </span>

            </div>


            <span
              className={`transition-transform duration-300 ${
                salesOpen
                  ? "rotate-180"
                  : ""
              }`}
            >
              ▼
            </span>

          </button>


          {/* ============================= */}
          {/* SALES SUBMENU */}
          {/* ============================= */}

          {salesOpen && (

            <div className="ml-5 mt-2 space-y-2 border-l border-slate-700 pl-3">


              {/* MANAGE SALES */}

              <Link
                href="/sales"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
                  pathname === "/sales"
                    ? "bg-green-500/20 text-green-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >

                <span>
                  💰
                </span>

                <span>
                  Manage Sales
                </span>

              </Link>


              {/* SALES ANALYTICS */}

              <Link
                href="/sales-analytics"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
                  pathname === "/sales-analytics"
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >

                <span>
                  📊
                </span>

                <span>
                  Sales Analytics
                </span>

              </Link>


            </div>

          )}

        </div>


        {/* ============================= */}
        {/* SUBSCRIPTION DROPDOWN */}
        {/* ============================= */}

        <div>

          <button
            onClick={() =>
              setSubscriptionOpen(
                !subscriptionOpen
              )
            }
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
              isSubscriptionActive
                ? "bg-purple-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >

            <div className="flex items-center gap-3">

              <span className="text-xl">
                👑
              </span>

              <span>
                Subscription
              </span>

            </div>


            <span
              className={`transition-transform duration-300 ${
                subscriptionOpen
                  ? "rotate-180"
                  : ""
              }`}
            >
              ▼
            </span>

          </button>


          {/* ============================= */}
          {/* SUBSCRIPTION SUBMENU */}
          {/* ============================= */}

          {subscriptionOpen && (

            <div className="ml-5 mt-2 space-y-2 border-l border-slate-700 pl-3">


              {/* PRICING AND PLANS */}

              <Link
                href="/pricing"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
                  pathname === "/pricing"
                    ? "bg-purple-500/20 text-purple-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >

                <span>
                  💳
                </span>

                <span>
                  Pricing & Plans
                </span>

              </Link>


              {/* MY SUBSCRIPTION */}

              <Link
                href="/subscription"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
                  pathname === "/subscription"
                    ? "bg-purple-500/20 text-purple-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >

                <span>
                  👑
                </span>

                <span>
                  My Subscription
                </span>

              </Link>


            </div>

          )}

        </div>


        {/* ============================= */}
        {/* REST OF MENU */}
        {/* ============================= */}

        {menuItems.slice(6).map((item) => {

          const isActive =
            pathname === item.href;

          return (

            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >

              <span className="text-xl">
                {item.icon}
              </span>

              <span>
                {item.name}
              </span>

            </Link>

          );

        })}

      </nav>


      {/* ============================= */}
      {/* LOGOUT */}
      {/* ============================= */}

      <div className="mt-10 pt-6 border-t border-slate-800">

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition"
        >

          <span className="text-xl">
            🚪
          </span>

          <span>
            Logout
          </span>

        </button>

      </div>

    </aside>
  );
}