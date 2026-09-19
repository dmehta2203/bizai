"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import FeatureGuard from "@/components/FeatureGuard";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  business_name: string | null;
  created_at?: string;
};

type Activity = {
  id: string;
  customer_id: string;
  activity_type: string;
  activity_message: string;
  created_at: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // ==========================
  // ADD CUSTOMER FORM
  // ==========================

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");

  const [loading, setLoading] = useState(false);

  // ==========================
  // CUSTOMER TIMELINE
  // ==========================

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [activityMessage, setActivityMessage] =
    useState("");

  const [activityLoading, setActivityLoading] =
    useState(false);

  // ==========================
  // SEARCH AND SORT
  // ==========================

  const [search, setSearch] = useState("");

  const [sortOrder, setSortOrder] =
    useState<"newest" | "oldest">("newest");

  // ==========================
  // EDIT CUSTOMER
  // ==========================

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [editBusinessName, setEditBusinessName] =
    useState("");

  const [editLoading, setEditLoading] =
    useState(false);

  // ==========================
  // LOAD USER + CUSTOMERS
  // ==========================

  useEffect(() => {
    loadUserAndCustomers();
  }, []);

  async function loadUserAndCustomers() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      setUserId(session.user.id);

      await fetchCustomers(session.user.id);
    } else {
      window.location.href = "/login";
    }
  }

  // ==========================
  // FETCH CUSTOMERS
  // ==========================

  async function fetchCustomers(
    currentUserId?: string
  ) {
    const id = currentUserId || userId;

    if (!id) return;

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error fetching customers:",
        error.message
      );
    } else {
      setCustomers(data || []);
    }
  }

  // ==========================
  // FILTER AND SORT
  // ==========================

  const filteredCustomers = useMemo(() => {
    const searchText =
      search.toLowerCase().trim();

    let result = customers.filter(
      (customer) => {
        if (!searchText) return true;

        return (
          customer.name
            ?.toLowerCase()
            .includes(searchText) ||
          customer.phone
            ?.toLowerCase()
            .includes(searchText) ||
          customer.email
            ?.toLowerCase()
            .includes(searchText) ||
          customer.business_name
            ?.toLowerCase()
            .includes(searchText)
        );
      }
    );

    result.sort((a, b) => {
      const dateA = a.created_at
        ? new Date(a.created_at).getTime()
        : 0;

      const dateB = b.created_at
        ? new Date(b.created_at).getTime()
        : 0;

      if (sortOrder === "newest") {
        return dateB - dateA;
      }

      return dateA - dateB;
    });

    return result;
  }, [
    customers,
    search,
    sortOrder,
  ]);

  // ==========================
  // ADD CUSTOMER
  // ==========================

  async function addCustomer(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Customer name is required");
      return;
    }

    if (!userId) {
      alert("Please login first");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .insert([
        {
          user_id: userId,
          name: name,
          phone: phone || null,
          email: email || null,
          business_name:
            businessName || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      await supabase
        .from("customer_activities")
        .insert([
          {
            user_id: userId,
            customer_id: data.id,
            activity_type: "Customer Added",
            activity_message:
              "Customer was added to BizAI.",
          },
        ]);

      alert(
        "Customer added successfully! 🎉"
      );

      setName("");
      setPhone("");
      setEmail("");
      setBusinessName("");

      fetchCustomers();
    }

    setLoading(false);
  }

  // ==========================
  // START EDIT CUSTOMER
  // ==========================

  function startEdit(customer: Customer) {
    setEditingCustomer(customer);

    setEditName(customer.name || "");
    setEditPhone(customer.phone || "");
    setEditEmail(customer.email || "");

    setEditBusinessName(
      customer.business_name || ""
    );
  }

  // ==========================
  // CANCEL EDIT
  // ==========================

  function cancelEdit() {
    setEditingCustomer(null);

    setEditName("");
    setEditPhone("");
    setEditEmail("");
    setEditBusinessName("");
  }

  // ==========================
  // UPDATE CUSTOMER
  // ==========================

  async function updateCustomer(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!editingCustomer) return;

    if (!editName.trim()) {
      alert("Customer name is required");
      return;
    }

    if (!userId) {
      alert("Please login first");
      return;
    }

    setEditLoading(true);

    const { error } = await supabase
      .from("customers")
      .update({
        name: editName,
        phone: editPhone || null,
        email: editEmail || null,
        business_name:
          editBusinessName || null,
      })
      .eq("id", editingCustomer.id)
      .eq("user_id", userId);

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      await supabase
        .from("customer_activities")
        .insert([
          {
            user_id: userId,
            customer_id:
              editingCustomer.id,
            activity_type:
              "Customer Updated",
            activity_message:
              "Customer information was updated.",
          },
        ]);

      alert(
        "Customer updated successfully! ✏️🎉"
      );

      if (
        selectedCustomer?.id ===
        editingCustomer.id
      ) {
        setSelectedCustomer({
          ...selectedCustomer,
          name: editName,
          phone: editPhone || null,
          email: editEmail || null,
          business_name:
            editBusinessName || null,
        });

        fetchActivities(
          editingCustomer.id
        );
      }

      cancelEdit();

      fetchCustomers();
    }

    setEditLoading(false);
  }

  // ==========================
  // DELETE CUSTOMER
  // ==========================

  async function deleteCustomer(
    id: string
  ) {
    const confirmed = confirm(
      "Are you sure you want to delete this customer?"
    );

    if (!confirmed) return;

    if (!userId) return;

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error(error);

      alert(error.message);
    } else {
      if (
        selectedCustomer?.id === id
      ) {
        setSelectedCustomer(null);
        setActivities([]);
      }

      if (
        editingCustomer?.id === id
      ) {
        cancelEdit();
      }

      fetchCustomers();
    }
  }

  // ==========================
  // OPEN CUSTOMER TIMELINE
  // ==========================

  async function openCustomer(
    customer: Customer
  ) {
    setSelectedCustomer(customer);

    setActivityMessage("");

    await fetchActivities(
      customer.id
    );
  }

  // ==========================
  // FETCH ACTIVITIES
  // ==========================

  async function fetchActivities(
    customerId: string
  ) {
    const { data, error } = await supabase
      .from("customer_activities")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error fetching activities:",
        error.message
      );
    } else {
      setActivities(data || []);
    }
  }

  // ==========================
  // ADD ACTIVITY
  // ==========================

  async function addActivity(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!selectedCustomer) return;

    if (!activityMessage.trim()) {
      alert("Please enter an activity");
      return;
    }

    if (!userId) {
      alert("Please login first");
      return;
    }

    setActivityLoading(true);

    const { error } = await supabase
      .from("customer_activities")
      .insert([
        {
          user_id: userId,
          customer_id:
            selectedCustomer.id,
          activity_type: "Activity",
          activity_message:
            activityMessage,
        },
      ]);

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      setActivityMessage("");

      fetchActivities(
        selectedCustomer.id
      );
    }

    setActivityLoading(false);
  }

  // ==========================
  // ACTIVITY ICON
  // ==========================

  function getActivityIcon(
    activityType: string
  ) {
    switch (activityType) {
      case "Customer Added":
        return "👤";

      case "Customer Updated":
        return "✏️";

      case "Contacted":
        return "📞";

      case "Appointment":
        return "📅";

      case "WhatsApp":
        return "💬";

      case "Follow-up":
        return "🔥";

      default:
        return "📝";
    }
  }

  // ==========================
  // FORMAT DATE
  // ==========================

  function formatDate(date: string) {
    return new Date(
      date
    ).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // ==========================
  // PAGE UI
  // ==========================

  return (
    <ProtectedLayout>

      <FeatureGuard feature="customers">

        <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">

          <div className="max-w-7xl mx-auto">

            {/* HEADER */}

            <h1 className="text-3xl font-bold mb-2">
              👥 Customer Management
            </h1>

            <p className="text-slate-400 mb-8">
              Manage customers and track their activity history
            </p>

            {/* ADD CUSTOMER */}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-10">

              <h2 className="text-xl font-semibold mb-6">
                ➕ Add New Customer
              </h2>

              <form onSubmit={addCustomer}>

                <input
                  type="text"
                  placeholder="Customer Name *"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                />

                <input
                  type="text"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                />

                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                />

                <input
                  type="text"
                  placeholder="Business Name"
                  value={businessName}
                  onChange={(e) =>
                    setBusinessName(e.target.value)
                  }
                  className="w-full p-3 mb-6 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 transition p-3 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading
                    ? "Adding Customer..."
                    : "➕ Add Customer"}
                </button>

              </form>

            </div>

            {/* EDIT CUSTOMER */}

            {editingCustomer && (

              <div className="bg-slate-900 border border-yellow-500/50 rounded-xl p-6 mb-10">

                <div className="flex justify-between items-center mb-6">

                  <div>

                    <h2 className="text-xl font-semibold">
                      ✏️ Edit Customer
                    </h2>

                    <p className="text-slate-400 text-sm mt-1">
                      Update customer information
                    </p>

                  </div>

                  <button
                    onClick={cancelEdit}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕ Close
                  </button>

                </div>

                <form onSubmit={updateCustomer}>

                  <input
                    type="text"
                    placeholder="Customer Name *"
                    value={editName}
                    onChange={(e) =>
                      setEditName(e.target.value)
                    }
                    className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-yellow-500"
                  />

                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={editPhone}
                    onChange={(e) =>
                      setEditPhone(e.target.value)
                    }
                    className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-yellow-500"
                  />

                  <input
                    type="email"
                    placeholder="Email Address"
                    value={editEmail}
                    onChange={(e) =>
                      setEditEmail(e.target.value)
                    }
                    className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-yellow-500"
                  />

                  <input
                    type="text"
                    placeholder="Business Name"
                    value={editBusinessName}
                    onChange={(e) =>
                      setEditBusinessName(
                        e.target.value
                      )
                    }
                    className="w-full p-3 mb-6 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-yellow-500"
                  />

                  <div className="flex flex-col sm:flex-row gap-3">

                    <button
                      type="submit"
                      disabled={editLoading}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 transition p-3 rounded-lg font-semibold disabled:opacity-50"
                    >
                      {editLoading
                        ? "Saving..."
                        : "💾 Save Changes"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex-1 border border-slate-700 hover:border-red-500 transition p-3 rounded-lg"
                    >
                      ❌ Cancel
                    </button>

                  </div>

                </form>

              </div>

            )}

            {/* CUSTOMER SEARCH */}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">

              <div className="flex flex-col md:flex-row gap-4">

                <div className="flex-1">

                  <input
                    type="text"
                    placeholder="🔎 Search by name, phone, email or business..."
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                  />

                </div>

                <select
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(
                      e.target.value as
                        | "newest"
                        | "oldest"
                    )
                  }
                  className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                >
                  <option value="newest">
                    🆕 Newest First
                  </option>

                  <option value="oldest">
                    ⏳ Oldest First
                  </option>
                </select>

                {search && (

                  <button
                    onClick={() =>
                      setSearch("")
                    }
                    className="border border-slate-700 hover:border-red-500 px-5 py-3 rounded-lg transition"
                  >
                    ✕ Clear
                  </button>

                )}

              </div>

            </div>

            {/* CUSTOMER LIST */}

            <div className="mb-10">

              <div className="flex justify-between items-center mb-6">

                <div>

                  <h2 className="text-2xl font-semibold">
                    Your Customers
                  </h2>

                  <p className="text-slate-400 text-sm mt-1">
                    Showing {filteredCustomers.length} of{" "}
                    {customers.length} customers
                  </p>

                </div>

                <button
                  onClick={() =>
                    fetchCustomers()
                  }
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  🔄 Refresh
                </button>

              </div>

              {customers.length === 0 ? (

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">

                  No customers yet.

                  <br />

                  Add your first customer above! 🚀

                </div>

              ) : filteredCustomers.length === 0 ? (

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">

                  🔎 No customers found.

                  <br />

                  Try a different search.

                </div>

              ) : (

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                  {filteredCustomers.map(
                    (customer) => (

                      <div
                        key={customer.id}
                        className={`bg-slate-900 border rounded-xl p-6 transition ${
                          selectedCustomer?.id ===
                          customer.id
                            ? "border-blue-500"
                            : "border-slate-800"
                        }`}
                      >

                        <h3 className="text-xl font-bold mb-4">
                          👤 {customer.name}
                        </h3>

                        {customer.business_name && (

                          <p className="text-slate-300 mb-2">
                            🏢 {customer.business_name}
                          </p>

                        )}

                        {customer.phone && (

                          <p className="text-slate-300 mb-2">
                            📞 {customer.phone}
                          </p>

                        )}

                        {customer.email && (

                          <p className="text-slate-300 mb-4 break-words">
                            📧 {customer.email}
                          </p>

                        )}

                        <div className="grid grid-cols-2 gap-3 mt-5">

                          <button
                            onClick={() =>
                              openCustomer(customer)
                            }
                            className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg text-sm"
                          >
                            📋 Timeline
                          </button>

                          <button
                            onClick={() =>
                              startEdit(customer)
                            }
                            className="bg-yellow-600 hover:bg-yellow-700 transition px-4 py-2 rounded-lg text-sm"
                          >
                            ✏️ Edit
                          </button>

                          <button
                            onClick={() =>
                              deleteCustomer(
                                customer.id
                              )
                            }
                            className="col-span-2 bg-red-600 hover:bg-red-700 transition px-4 py-2 rounded-lg text-sm"
                          >
                            🗑 Delete Customer
                          </button>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

            {/* ACTIVITY TIMELINE */}

            {selectedCustomer && (

              <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-6">

                <div className="flex justify-between items-center mb-6">

                  <div>

                    <h2 className="text-2xl font-bold">
                      📋 Customer Activity Timeline
                    </h2>

                    <p className="text-slate-400 mt-1">
                      Activity history for{" "}

                      <span className="text-white font-semibold">
                        {selectedCustomer.name}
                      </span>
                    </p>

                  </div>

                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setActivities([]);
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕ Close
                  </button>

                </div>

                {/* ADD ACTIVITY */}

                <form
                  onSubmit={addActivity}
                  className="flex flex-col sm:flex-row gap-3 mb-8"
                >

                  <input
                    type="text"
                    placeholder="Example: Called customer about new offer..."
                    value={activityMessage}
                    onChange={(e) =>
                      setActivityMessage(
                        e.target.value
                      )
                    }
                    className="flex-1 p-3 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    disabled={activityLoading}
                    className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {activityLoading
                      ? "Adding..."
                      : "➕ Add Activity"}
                  </button>

                </form>

                {/* TIMELINE */}

                {activities.length === 0 ? (

                  <div className="text-center text-slate-400 py-8">
                    No activities yet.
                  </div>

                ) : (

                  <div className="space-y-5">

                    {activities.map(
                      (activity) => (

                        <div
                          key={activity.id}
                          className="flex gap-4"
                        >

                          <div className="text-2xl">

                            {getActivityIcon(
                              activity.activity_type
                            )}

                          </div>

                          <div className="flex-1 border-l border-slate-700 pl-5 pb-5">

                            <h3 className="font-semibold">
                              {activity.activity_type}
                            </h3>

                            <p className="text-slate-300 mt-1">
                              {activity.activity_message}
                            </p>

                            <p className="text-slate-500 text-xs mt-2">
                              {formatDate(
                                activity.created_at
                              )}
                            </p>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

            )}

          </div>

        </main>

      </FeatureGuard>

    </ProtectedLayout>
  );
}