import OwnerSidebar from "@/components/OwnerSidebar";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">

      <OwnerSidebar />

      <main className="flex-1 min-w-0">

        {children}

      </main>

    </div>
  );
}