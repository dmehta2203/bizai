"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const menuItems = [
  {
    name: "Owner Dashboard",
    href: "/owner/dashboard",
    icon: "👑",
  },
  {
    name: "All Users",
    href: "/owner/users",
    icon: "👥",
  },
  {
    name: "Subscriptions",
    href: "/owner/subscriptions",
    icon: "💳",
  },
  {
    name: "Payments",
    href: "/owner/payments",
    icon: "💰",
  },
  {
    name: "Platform Analytics",
    href: "/owner/analytics",
    icon: "📊",
  },
];

export default function OwnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await supabase.auth.signOut();

      router.push("/login");

      router.refresh();
    } catch (error) {
      console.error(
        "Owner logout error:",
        error
      );
    }
  }

  return (
    <aside className="w-full md:w-72 md:min-h-screen bg-slate-950 border-r border-slate-800 p-5 flex flex-col">

      {/* ============================= */}
      {/* OWNER LOGO */}
      {/* ============================= */}

      <div className="mb-10">

        <Link
          href="/owner/dashboard"
          className="block"
        >

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-2xl">

              👑

            </div>

            <div>

              <h1 className="text-xl font-bold text-white">

                BizAI Owner

              </h1>

              <p className="text-xs text-purple-400 mt-1">

                Administration Panel

              </p>

            </div>

          </div>

        </Link>

      </div>


      {/* ============================= */}
      {/* MENU TITLE */}
      {/* ============================= */}

      <p className="text-xs font-semibold text-slate-500 tracking-wider px-3 mb-4">

        OWNER MENU

      </p>


      {/* ============================= */}
      {/* NAVIGATION */}
      {/* ============================= */}

      <nav className="space-y-2 flex-1">

        {menuItems.map((item) => {

          const isActive =
            pathname === item.href;

          return (

            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition ${
                isActive
                  ? "bg-purple-600 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >

              <span className="text-xl">

                {item.icon}

              </span>

              <span className="font-medium">

                {item.name}

              </span>

            </Link>

          );

        })}

      </nav>


      {/* ============================= */}
      {/* OWNER INFO */}
      {/* ============================= */}

      <div className="mt-8">

        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mb-3">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">

              👑

            </div>

            <div>

              <p className="text-white font-semibold text-sm">

                Platform Owner

              </p>

              <p className="text-purple-400 text-xs mt-1">

                Full Access

              </p>

            </div>

          </div>

        </div>


        {/* USER DASHBOARD */}

        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-white transition"
        >

          <span className="text-xl">

            🏠

          </span>

          <span>

            User Dashboard

          </span>

        </Link>


        {/* LOGOUT */}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition"
        >

          <span className="text-xl">

            🚪

          </span>

          <span className="font-medium">

            Logout

          </span>

        </button>

      </div>


      {/* ============================= */}
      {/* FOOTER */}
      {/* ============================= */}

      <div className="mt-5 pt-5 border-t border-slate-800">

        <p className="text-center text-xs text-slate-600">

          BizAI Owner Panel

        </p>

      </div>

    </aside>
  );
}