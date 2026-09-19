"use client";

import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-white md:flex">

        {/* SIDEBAR */}

        <Sidebar />

        {/* PAGE CONTENT */}

        <main className="flex-1 min-w-0">
          {children}
        </main>

      </div>
    </AuthGuard>
  );
}