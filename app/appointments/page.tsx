"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import FeatureGuard from "@/components/FeatureGuard";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

// =====================================
// TYPES
// =====================================

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  business_name: string | null;
};

type Appointment = {
  id: string;
  user_id: string;

  customer_id: string | null;
  customer_name: string;

  appointment_date: string;
  appointment_time: string;

  purpose: string | null;
  status: string;
};

// =====================================
// STATUS OPTIONS
// =====================================

const STATUS_OPTIONS = [
  "Scheduled",
  "Completed",
  "Cancelled",
];

// =====================================
// PAGE
// =====================================

export default function AppointmentsPage() {

  // =====================================
  // DATA STATES
  // =====================================

  const [appointments, setAppointments] =
    useState<Appointment[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [userId, setUserId] =
    useState<string | null>(null);

  // =====================================
  // FORM STATES
  // =====================================

  const [selectedCustomerId, setSelectedCustomerId] =
    useState("");

  const [appointmentDate, setAppointmentDate] =
    useState("");

  const [appointmentTime, setAppointmentTime] =
    useState("");

  const [purpose, setPurpose] =
    useState("");

  const [status, setStatus] =
    useState("Scheduled");

  // =====================================
  // UI STATES
  // =====================================

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  // =====================================
  // LOAD DATA
  // =====================================

  useEffect(() => {
    loadUserAndData();
  }, []);

  async function loadUserAndData() {

    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {

      window.location.href = "/login";

      return;
    }

    setUserId(session.user.id);

    await Promise.all([
      fetchCustomers(session.user.id),
      fetchAppointments(session.user.id),
    ]);

    setLoading(false);
  }

  // =====================================
  // FETCH CUSTOMERS
  // =====================================

  async function fetchCustomers(
    currentUserId?: string
  ) {

    const id =
      currentUserId || userId;

    if (!id) return;

    const { data, error } =
      await supabase
        .from("customers")
        .select("*")
        .eq("user_id", id)
        .order("name");

    if (error) {

      console.error(
        "Error fetching customers:",
        error.message
      );

      return;
    }

    setCustomers(data || []);
  }

  // =====================================
  // FETCH APPOINTMENTS
  // =====================================

  async function fetchAppointments(
    currentUserId?: string
  ) {

    const id =
      currentUserId || userId;

    if (!id) return;

    const { data, error } =
      await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", id)
        .order(
          "appointment_date",
          {
            ascending: true,
          }
        )
        .order(
          "appointment_time",
          {
            ascending: true,
          }
        );

    if (error) {

      console.error(
        "Error fetching appointments:",
        error.message
      );

      alert(error.message);

      return;
    }

    setAppointments(data || []);
  }

  // =====================================
  // REFRESH
  // =====================================

  async function refreshData() {

    if (!userId) return;

    setRefreshing(true);

    await Promise.all([
      fetchCustomers(),
      fetchAppointments(),
    ]);

    setRefreshing(false);
  }

  // =====================================
  // GET SELECTED CUSTOMER
  // =====================================

  const selectedCustomer =
    customers.find(
      (customer) =>
        customer.id === selectedCustomerId
    );

  // =====================================
  // RESET FORM
  // =====================================

  function resetForm() {

    setSelectedCustomerId("");

    setAppointmentDate("");

    setAppointmentTime("");

    setPurpose("");

    setStatus("Scheduled");

    setEditingAppointment(null);
  }

  // =====================================
  // ADD APPOINTMENT
  // =====================================

  async function addAppointment(
    e: React.FormEvent
  ) {

    e.preventDefault();

    if (
      !selectedCustomerId ||
      !appointmentDate ||
      !appointmentTime
    ) {

      alert(
        "Please select a customer, date and time"
      );

      return;
    }

    if (!selectedCustomer) {

      alert(
        "Please select a valid customer"
      );

      return;
    }

    if (!userId) {

      alert("Please login first");

      return;
    }

    setSaving(true);

    const { data, error } =
      await supabase
        .from("appointments")
        .insert([
          {
            user_id: userId,

            customer_id:
              selectedCustomer.id,

            customer_name:
              selectedCustomer.name,

            appointment_date:
              appointmentDate,

            appointment_time:
              appointmentTime,

            purpose:
              purpose.trim() || null,

            status,
          },
        ])
        .select()
        .single();

    if (error) {

      console.error(
        "Error adding appointment:",
        error
      );

      alert(error.message);

    } else {

      // =====================================
      // ADD ACTIVITY TO CUSTOMER TIMELINE
      // =====================================

      await supabase
        .from("customer_activities")
        .insert([
          {
            user_id: userId,

            customer_id:
              selectedCustomer.id,

            activity_type:
              "Appointment",

            activity_message:
              `Appointment scheduled for ${formatDate(
                appointmentDate
              )} at ${appointmentTime}${
                purpose.trim()
                  ? ` - ${purpose.trim()}`
                  : ""
              }`,
          },
        ]);

      alert(
        "Appointment scheduled successfully! 🎉"
      );

      resetForm();

      await fetchAppointments();
    }

    setSaving(false);
  }

  // =====================================
  // START EDIT
  // =====================================

  function startEdit(
    appointment: Appointment
  ) {

    setEditingAppointment(appointment);

    setSelectedCustomerId(
      appointment.customer_id || ""
    );

    setAppointmentDate(
      appointment.appointment_date
    );

    setAppointmentTime(
      appointment.appointment_time
    );

    setPurpose(
      appointment.purpose || ""
    );

    setStatus(
      appointment.status
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =====================================
  // UPDATE APPOINTMENT
  // =====================================

  async function updateAppointment(
    e: React.FormEvent
  ) {

    e.preventDefault();

    if (!editingAppointment) return;

    if (
      !selectedCustomerId ||
      !appointmentDate ||
      !appointmentTime
    ) {

      alert(
        "Please select a customer, date and time"
      );

      return;
    }

    if (!selectedCustomer) {

      alert(
        "Please select a valid customer"
      );

      return;
    }

    if (!userId) {

      alert("Please login first");

      return;
    }

    setSaving(true);

    const { error } =
      await supabase
        .from("appointments")
        .update({

          customer_id:
            selectedCustomer.id,

          customer_name:
            selectedCustomer.name,

          appointment_date:
            appointmentDate,

          appointment_time:
            appointmentTime,

          purpose:
            purpose.trim() || null,

          status,
        })
        .eq(
          "id",
          editingAppointment.id
        )
        .eq(
          "user_id",
          userId
        );

    if (error) {

      console.error(
        "Error updating appointment:",
        error
      );

      alert(error.message);

    } else {

      // =====================================
      // ADD ACTIVITY
      // =====================================

      await supabase
        .from("customer_activities")
        .insert([
          {
            user_id: userId,

            customer_id:
              selectedCustomer.id,

            activity_type:
              "Appointment",

            activity_message:
              `Appointment updated for ${formatDate(
                appointmentDate
              )} at ${appointmentTime}`,
          },
        ]);

      alert(
        "Appointment updated successfully! 🎉"
      );

      resetForm();

      await fetchAppointments();
    }

    setSaving(false);
  }

  // =====================================
  // UPDATE STATUS
  // =====================================

  async function updateAppointmentStatus(
    appointment: Appointment,
    newStatus: string
  ) {

    if (!userId) return;

    const { error } =
      await supabase
        .from("appointments")
        .update({
          status: newStatus,
        })
        .eq(
          "id",
          appointment.id
        )
        .eq(
          "user_id",
          userId
        );

    if (error) {

      alert(error.message);

    } else {

      // =====================================
      // ADD CUSTOMER ACTIVITY
      // =====================================

      if (appointment.customer_id) {

        await supabase
          .from("customer_activities")
          .insert([
            {
              user_id: userId,

              customer_id:
                appointment.customer_id,

              activity_type:
                "Appointment",

              activity_message:
                `Appointment status changed to ${newStatus}.`,
            },
          ]);
      }

      await fetchAppointments();
    }
  }

  // =====================================
  // DELETE APPOINTMENT
  // =====================================

  async function deleteAppointment(
    appointment: Appointment
  ) {

    const confirmed = confirm(
      "Are you sure you want to delete this appointment?"
    );

    if (!confirmed) return;

    if (!userId) return;

    const { error } =
      await supabase
        .from("appointments")
        .delete()
        .eq(
          "id",
          appointment.id
        )
        .eq(
          "user_id",
          userId
        );

    if (error) {

      alert(error.message);

    } else {

      // =====================================
      // ADD ACTIVITY
      // =====================================

      if (appointment.customer_id) {

        await supabase
          .from("customer_activities")
          .insert([
            {
              user_id: userId,

              customer_id:
                appointment.customer_id,

              activity_type:
                "Appointment",

              activity_message:
                "Appointment was deleted.",
            },
          ]);
      }

      if (
        editingAppointment?.id ===
        appointment.id
      ) {

        resetForm();
      }

      await fetchAppointments();
    }
  }

  // =====================================
  // STATUS COLOR
  // =====================================

  function getStatusColor(
    appointmentStatus: string
  ) {

    switch (appointmentStatus) {

      case "Scheduled":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";

      case "Completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";

      case "Cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30";

      default:
        return "bg-slate-700 text-slate-300 border-slate-600";
    }
  }

  // =====================================
  // FORMAT DATE
  // =====================================

  function formatDate(
    date: string
  ) {

    if (!date) return "";

    const [
      year,
      month,
      day,
    ] =
      date
        .split("-")
        .map(Number);

    const localDate =
      new Date(
        year,
        month - 1,
        day
      );

    return localDate.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  // =====================================
  // GET TODAY
  // =====================================

  function getTodayDate() {

    const today =
      new Date();

    const year =
      today.getFullYear();

    const month =
      String(
        today.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        today.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // =====================================
  // STATS
  // =====================================

  const stats =
    useMemo(() => {

      const today =
        getTodayDate();

      const total =
        appointments.length;

      const todayAppointments =
        appointments.filter(
          (appointment) =>
            appointment.appointment_date ===
              today &&
            appointment.status !==
              "Cancelled"
        ).length;

      const upcoming =
        appointments.filter(
          (appointment) =>
            appointment.appointment_date >
              today &&
            appointment.status ===
              "Scheduled"
        ).length;

      const completed =
        appointments.filter(
          (appointment) =>
            appointment.status ===
              "Completed"
        ).length;

      const overdue =
        appointments.filter(
          (appointment) =>
            appointment.appointment_date <
              today &&
            appointment.status ===
              "Scheduled"
        ).length;

      return {
        total,
        todayAppointments,
        upcoming,
        completed,
        overdue,
      };

    }, [appointments]);

  // =====================================
  // SEARCH
  // =====================================

  const filteredAppointments =
    appointments.filter(
      (appointment) => {

        const searchText =
          search.toLowerCase();

        return (
          appointment.customer_name
            .toLowerCase()
            .includes(searchText) ||

          appointment.status
            .toLowerCase()
            .includes(searchText) ||

          appointment.purpose
            ?.toLowerCase()
            .includes(searchText)
        );
      }
    );

  // =====================================
  // LOADING
  // =====================================

  if (loading) {

    return (
      <ProtectedLayout>

        <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

          <div className="text-center">

            <div className="text-5xl mb-4">
              📅
            </div>

            <h2 className="text-xl font-semibold">
              Loading Appointments...
            </h2>

            <p className="text-slate-400 mt-2">
              Getting your schedule ready.
            </p>

          </div>

        </main>

      </ProtectedLayout>
    );
  }

  // =====================================
  // PAGE UI
  // =====================================

  return (

    <ProtectedLayout>

      {/* FEATURE GUARD */}

      <FeatureGuard feature="appointments">

        <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

          <div className="max-w-7xl mx-auto">

            {/* HEADER */}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

              <div>

                <h1 className="text-3xl md:text-4xl font-bold">
                  📅 Appointment Management
                </h1>

                <p className="text-slate-400 mt-2">
                  Schedule appointments and
                  connect them with your customers.
                </p>

              </div>

              <button
                onClick={refreshData}
                disabled={refreshing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-3 rounded-xl font-semibold"
              >
                {refreshing
                  ? "🔄 Refreshing..."
                  : "🔄 Refresh Data"}
              </button>

            </div>


            {/* STATS */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

                <p className="text-slate-400 text-sm">
                  📅 Total
                </p>

                <p className="text-3xl font-bold mt-2">
                  {stats.total}
                </p>

              </div>


              <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">

                <p className="text-blue-400 text-sm">
                  🔥 Today
                </p>

                <p className="text-3xl font-bold mt-2">
                  {stats.todayAppointments}
                </p>

              </div>


              <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5">

                <p className="text-purple-400 text-sm">
                  ⏳ Upcoming
                </p>

                <p className="text-3xl font-bold mt-2">
                  {stats.upcoming}
                </p>

              </div>


              <div className="bg-slate-900 border border-green-500/30 rounded-xl p-5">

                <p className="text-green-400 text-sm">
                  ✅ Completed
                </p>

                <p className="text-3xl font-bold mt-2">
                  {stats.completed}
                </p>

              </div>


              <div className="bg-slate-900 border border-red-500/30 rounded-xl p-5">

                <p className="text-red-400 text-sm">
                  🚨 Overdue
                </p>

                <p className="text-3xl font-bold mt-2">
                  {stats.overdue}
                </p>

              </div>

            </div>


            {/* FORM */}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-10">

              <div className="flex items-center justify-between gap-4 mb-6">

                <div>

                  <h2 className="text-xl font-bold">

                    {editingAppointment
                      ? "✏️ Edit Appointment"
                      : "➕ Schedule New Appointment"}

                  </h2>

                  <p className="text-slate-400 text-sm mt-1">
                    Select an existing customer and
                    schedule their appointment.
                  </p>

                </div>


                {editingAppointment && (

                  <button
                    onClick={resetForm}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancel Edit
                  </button>

                )}

              </div>


              <form
                onSubmit={
                  editingAppointment
                    ? updateAppointment
                    : addAppointment
                }
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >

                {/* CUSTOMER SELECT */}

                <select
                  value={selectedCustomerId}
                  onChange={(e) =>
                    setSelectedCustomerId(
                      e.target.value
                    )
                  }
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                >

                  <option value="">
                    👥 Select Customer *
                  </option>

                  {customers.map(
                    (customer) => (

                      <option
                        key={customer.id}
                        value={customer.id}
                      >

                        {customer.name}

                        {customer.business_name
                          ? ` - ${customer.business_name}`
                          : ""}

                      </option>

                    )
                  )}

                </select>


                {/* DATE */}

                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) =>
                    setAppointmentDate(
                      e.target.value
                    )
                  }
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                />


                {/* TIME */}

                <input
                  type="time"
                  value={appointmentTime}
                  onChange={(e) =>
                    setAppointmentTime(
                      e.target.value
                    )
                  }
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                />


                {/* STATUS */}

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value
                    )
                  }
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                >

                  {STATUS_OPTIONS.map(
                    (option) => (

                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>

                    )
                  )}

                </select>


                {/* CUSTOMER DETAILS */}

                {selectedCustomer && (

                  <div className="md:col-span-2 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">

                    <p className="font-semibold mb-2">
                      👤 Customer Details
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-300">

                      <p>
                        👤 {selectedCustomer.name}
                      </p>

                      <p>
                        📞 {selectedCustomer.phone || "No phone"}
                      </p>

                      <p>
                        📧 {selectedCustomer.email || "No email"}
                      </p>

                    </div>

                  </div>

                )}


                {/* PURPOSE */}

                <textarea
                  placeholder="Purpose / Notes"
                  value={purpose}
                  onChange={(e) =>
                    setPurpose(
                      e.target.value
                    )
                  }
                  className="md:col-span-2 w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500 min-h-[110px]"
                />


                {/* BUTTONS */}

                <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">

                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold"
                  >

                    {saving
                      ? "Saving..."
                      : editingAppointment
                      ? "💾 Update Appointment"
                      : "📅 Schedule Appointment"}

                  </button>


                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl"
                  >
                    Clear
                  </button>

                </div>

              </form>

            </div>


            {/* SEARCH */}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

              <div>

                <h2 className="text-2xl font-bold">
                  📋 Your Appointments
                </h2>

                <p className="text-slate-400 text-sm mt-1">
                  {filteredAppointments.length} appointment(s) found
                </p>

              </div>


              <input
                type="text"
                placeholder="🔍 Search appointments..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                className="w-full md:w-80 p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500"
              />

            </div>


            {/* APPOINTMENTS */}

            {filteredAppointments.length === 0 ? (

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">

                <div className="text-5xl mb-4">
                  📅
                </div>

                <h3 className="text-xl font-semibold">
                  No appointments found
                </h3>

                <p className="text-slate-400 mt-2">
                  Schedule your first appointment.
                </p>

              </div>

            ) : (

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                {filteredAppointments.map(
                  (appointment) => (

                    <div
                      key={appointment.id}
                      className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition rounded-2xl p-6"
                    >

                      <div className="flex justify-between gap-3 mb-5">

                        <div>

                          <h3 className="text-xl font-bold">
                            👤 {appointment.customer_name}
                          </h3>

                          <p className="text-slate-400 text-sm mt-1">
                            Business Appointment
                          </p>

                        </div>


                        <span
                          className={`border px-3 py-1 rounded-full text-xs h-fit ${getStatusColor(
                            appointment.status
                          )}`}
                        >
                          {appointment.status}
                        </span>

                      </div>


                      <div className="space-y-3 text-sm">

                        <p className="text-slate-300">
                          📅 {formatDate(
                            appointment.appointment_date
                          )}
                        </p>

                        <p className="text-slate-300">
                          🕐 {appointment.appointment_time}
                        </p>


                        {appointment.purpose && (

                          <div className="bg-slate-950 rounded-xl p-3 text-slate-400">
                            📝 {appointment.purpose}
                          </div>

                        )}

                      </div>


                      {/* STATUS */}

                      <select
                        value={appointment.status}
                        onChange={(e) =>
                          updateAppointmentStatus(
                            appointment,
                            e.target.value
                          )
                        }
                        className="w-full mt-5 p-3 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                      >

                        {STATUS_OPTIONS.map(
                          (option) => (

                            <option
                              key={option}
                              value={option}
                            >
                              {option}
                            </option>

                          )
                        )}

                      </select>


                      {/* BUTTONS */}

                      <div className="grid grid-cols-2 gap-3 mt-3">

                        <button
                          onClick={() =>
                            startEdit(
                              appointment
                            )
                          }
                          className="bg-blue-600 hover:bg-blue-700 transition p-3 rounded-xl font-semibold"
                        >
                          ✏️ Edit
                        </button>


                        <button
                          onClick={() =>
                            deleteAppointment(
                              appointment
                            )
                          }
                          className="bg-red-600 hover:bg-red-700 transition p-3 rounded-xl font-semibold"
                        >
                          🗑 Delete
                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}


            {/* FOOTER */}

            <div className="text-center text-slate-500 text-sm mt-10 pb-5">

              📅 BizAI Appointment Management •
              Manage customers and never miss
              an important meeting

            </div>

          </div>

        </main>

      </FeatureGuard>

    </ProtectedLayout>
  );
}