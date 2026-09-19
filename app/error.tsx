"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & {
    digest?: string;
  };

  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      "Application error:",
      error
    );
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

      <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center">

        <div className="text-6xl mb-5">
          ⚠️
        </div>

        <h1 className="text-2xl font-bold">
          Something went wrong
        </h1>

        <p className="text-slate-400 mt-3">
          Don't worry! Something unexpected happened.
          Please try again.
        </p>

        <button
          onClick={() => reset()}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 transition px-5 py-3 rounded-xl font-semibold"
        >
          🔄 Try Again
        </button>

        <button
          onClick={() => {
            window.location.href = "/dashboard";
          }}
          className="mt-3 w-full border border-slate-700 hover:bg-slate-800 transition px-5 py-3 rounded-xl"
        >
          🏠 Back to Dashboard
        </button>

      </div>

    </main>
  );
}