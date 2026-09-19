"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Lead = {
  id: string;
  name: string;
  status: string;
};

type Appointment = {
  id: string;
  customer_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
};

export default function InsightsPage() {
  const router = useRouter();

  const [customerCount, setCustomerCount] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Customers count
    const { count: customers } = await supabase
      .from("customers")
      .select("*", {
        count: "exact",
        head: true,
      });

    setCustomerCount(customers || 0);

    // Leads
    const { data: leadsData, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (leadsError) {
      console.error(leadsError);
    } else {
      setLeads(leadsData || []);
    }

    // Appointments
    const { data: appointmentsData, error: appointmentsError } =
      await supabase
        .from("appointments")
        .select("*")
        .order("appointment_date", {
          ascending: true,
        });

    if (appointmentsError) {
      console.error(appointmentsError);
    } else {
      setAppointments(appointmentsData || []);
    }

    setLoading(false);
  }

  // Lead counts
  const totalLeads = leads.length;

  const newLeads = leads.filter(
    (lead) => lead.status === "New"
  ).length;

  const contactedLeads = leads.filter(
    (lead) => lead.status === "Contacted"
  ).length;

  const convertedLeads = leads.filter(
    (lead) => lead.status === "Converted"
  ).length;

  // Leads needing follow-up
  const followUpLeads = leads.filter(
    (lead) =>
      lead.status === "New" ||
      lead.status === "Contacted"
  );

  // Upcoming appointments
  const today = new Date()
    .toISOString()
    .split("T")[0];

  const upcomingAppointments = appointments.filter(
    (appointment) =>
      appointment.appointment_date >= today &&
      appointment.status === "Scheduled"
  );

  // Conversion Rate
  const conversionRate =
    totalLeads > 0
      ? Math.round(
          (convertedLeads / totalLeads) * 100
        )
      : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">
          🤖 Analyzing your business...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex justify-between items-center mb-10">

          <div>

            <button
              onClick={() => router.push("/dashboard")}
              className="text-blue-400 text-sm mb-3 hover:text-blue-300"
            >
              ← Back to Dashboard
            </button>

            <h1 className="text-3xl md:text-4xl font-bold">
              📊 Smart Business Insights
            </h1>

            <p className="text-slate-400 mt-2">
              AI-powered insights from your business data
            </p>

          </div>

          <button
            onClick={loadInsights}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold"
          >
            🔄 Refresh
          </button>

        </div>


        {/* MAIN STATS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

            <p className="text-slate-400 text-sm">
              👥 Customers
            </p>

            <p className="text-3xl font-bold mt-2">
              {customerCount}
            </p>

          </div>


          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

            <p className="text-slate-400 text-sm">
              🎯 Total Leads
            </p>

            <p className="text-3xl font-bold mt-2">
              {totalLeads}
            </p>

          </div>


          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

            <p className="text-slate-400 text-sm">
              🔥 Follow-ups Needed
            </p>

            <p className="text-3xl font-bold mt-2">
              {followUpLeads.length}
            </p>

          </div>


          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

            <p className="text-slate-400 text-sm">
              📈 Conversion Rate
            </p>

            <p className="text-3xl font-bold mt-2">
              {conversionRate}%
            </p>

          </div>

        </div>


        {/* LEAD BREAKDOWN */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

            <h2 className="text-xl font-bold mb-6">
              🎯 Lead Status
            </h2>

            <div className="space-y-4">

              <div className="flex justify-between">
                <span className="text-slate-400">
                  🆕 New Leads
                </span>

                <span className="font-bold">
                  {newLeads}
                </span>
              </div>


              <div className="flex justify-between">
                <span className="text-slate-400">
                  📞 Contacted
                </span>

                <span className="font-bold">
                  {contactedLeads}
                </span>
              </div>


              <div className="flex justify-between">
                <span className="text-slate-400">
                  🎉 Converted
                </span>

                <span className="font-bold">
                  {convertedLeads}
                </span>
              </div>

            </div>

          </div>


          {/* APPOINTMENTS */}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

            <h2 className="text-xl font-bold mb-6">
              📅 Upcoming Appointments
            </h2>

            {upcomingAppointments.length === 0 ? (

              <p className="text-slate-400">
                No upcoming appointments.
              </p>

            ) : (

              <div className="space-y-4">

                {upcomingAppointments
                  .slice(0, 5)
                  .map((appointment) => (

                    <div
                      key={appointment.id}
                      className="border-b border-slate-800 pb-3"
                    >

                      <p className="font-semibold">
                        👤 {appointment.customer_name}
                      </p>

                      <p className="text-sm text-slate-400 mt-1">
                        📅 {appointment.appointment_date}
                      </p>

                      <p className="text-sm text-slate-400">
                        🕐 {appointment.appointment_time}
                      </p>

                    </div>

                  ))}

              </div>

            )}

          </div>

        </div>


        {/* FOLLOW UP LEADS */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-10">

          <h2 className="text-xl font-bold mb-6">
            🔥 Leads Needing Follow-up
          </h2>

          {followUpLeads.length === 0 ? (

            <p className="text-slate-400">
              🎉 Great! No leads need immediate follow-up.
            </p>

          ) : (

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {followUpLeads.map((lead) => (

                <div
                  key={lead.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-5"
                >

                  <p className="font-semibold text-lg">
                    👤 {lead.name}
                  </p>

                  <p className="text-slate-400 text-sm mt-2">
                    Status: {lead.status}
                  </p>

                  <button
                    onClick={() =>
                      router.push("/leads")
                    }
                    className="text-blue-400 text-sm mt-4 hover:text-blue-300"
                  >
                    View Lead →
                  </button>

                </div>

              ))}

            </div>

          )}

        </div>


        {/* SMART RECOMMENDATIONS */}

        <div className="bg-blue-600 rounded-xl p-6">

          <h2 className="text-xl font-bold mb-5">
            🤖 BizAI Recommendations
          </h2>

          <div className="space-y-3">

            {totalLeads === 0 && (
              <p>
                🎯 Start adding leads to track potential customers and grow your business.
              </p>
            )}

            {followUpLeads.length > 0 && (
              <p>
                🔥 You have {followUpLeads.length} lead(s) waiting for follow-up.
                Contact them soon to improve your conversion chances.
              </p>
            )}

            {conversionRate < 20 && totalLeads > 0 && (
              <p>
                📈 Your lead conversion rate is {conversionRate}%.
                Try faster follow-ups and personalized communication.
              </p>
            )}

            {upcomingAppointments.length > 0 && (
              <p>
                📅 You have {upcomingAppointments.length} upcoming appointment(s).
                Prepare in advance and follow up after each meeting.
              </p>
            )}

            {customerCount > 0 && (
              <p>
                👥 You have {customerCount} customer(s).
                Focus on maintaining strong relationships and asking for referrals.
              </p>
            )}

          </div>

        </div>

      </div>

    </main>
  );
}