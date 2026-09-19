export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

      <div className="text-center">

        {/* LOGO */}

        <div className="text-5xl font-bold mb-6">
          Biz
          <span className="text-blue-500">
            AI
          </span>
        </div>

        {/* LOADER */}

        <div className="flex justify-center">

          <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />

        </div>

        {/* TEXT */}

        <p className="text-slate-400 mt-5">
          Loading your business...
        </p>

      </div>

    </main>
  );
}