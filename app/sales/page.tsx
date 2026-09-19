"use client";

import FeatureGuard from "@/components/FeatureGuard";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Sale = {
  id: string;
  user_id: string;
  customer_id: string | null;
  title: string;
  amount: number;
  sale_date: string | null;
  payment_status: string;
  notes: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // =====================================
  // ADD SALE
  // =====================================

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // =====================================
  // SEARCH AND FILTER
  // =====================================

  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState("All");

  // =====================================
  // EDIT SALE
  // =====================================

  const [editingSale, setEditingSale] =
    useState<Sale | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editSaleDate, setEditSaleDate] = useState("");
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] =
    useState("Paid");

  const [editNotes, setEditNotes] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // =====================================
  // LOAD USER AND DATA
  // =====================================

  useEffect(() => {
    loadUserAndData();
  }, []);

  async function loadUserAndData() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      setUserId(session.user.id);

      fetchSales(session.user.id);
      fetchCustomers(session.user.id);
    } else {
      window.location.href = "/login";
    }
  }

  // =====================================
  // FETCH SALES
  // =====================================

  async function fetchSales(currentUserId?: string) {
    const id = currentUserId || userId;

    if (!id) return;

    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", id)
      .order("sale_date", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error fetching sales:",
        error.message
      );
    } else {
      setSales(data || []);
    }
  }

  // =====================================
  // FETCH CUSTOMERS
  // =====================================

  async function fetchCustomers(
    currentUserId?: string
  ) {
    const id = currentUserId || userId;

    if (!id) return;

    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .eq("user_id", id)
      .order("name");

    if (error) {
      console.error(
        "Error fetching customers:",
        error.message
      );
    } else {
      setCustomers(data || []);
    }
  }

  // =====================================
  // ADD SALE
  // =====================================

  async function addSale(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!title.trim()) {
      alert("Sale title is required");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!userId) {
      alert("Please login first");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("sales")
      .insert([
        {
          user_id: userId,
          customer_id: customerId || null,
          title: title.trim(),
          amount: Number(amount),
          sale_date: saleDate || null,
          payment_status: paymentStatus,
          notes: notes.trim() || null,
        },
      ]);

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      alert("Sale added successfully! 🎉");

      setTitle("");
      setAmount("");
      setSaleDate("");
      setCustomerId("");
      setPaymentStatus("Paid");
      setNotes("");

      fetchSales();
    }

    setLoading(false);
  }

  // =====================================
  // DELETE SALE
  // =====================================

  async function deleteSale(saleId: string) {
    const confirmed = confirm(
      "Are you sure you want to delete this sale?"
    );

    if (!confirmed) return;

    if (!userId) return;

    const { error } = await supabase
      .from("sales")
      .delete()
      .eq("id", saleId)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
    } else {
      alert("Sale deleted successfully");

      fetchSales();
    }
  }

  // =====================================
  // OPEN EDIT SALE
  // =====================================

  function openEditSale(sale: Sale) {
    setEditingSale(sale);

    setEditTitle(sale.title || "");

    setEditAmount(
      sale.amount?.toString() || ""
    );

    setEditSaleDate(
      sale.sale_date || ""
    );

    setEditCustomerId(
      sale.customer_id || ""
    );

    setEditPaymentStatus(
      sale.payment_status || "Paid"
    );

    setEditNotes(sale.notes || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =====================================
  // UPDATE SALE
  // =====================================

  async function updateSale(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!editingSale) return;

    if (!editTitle.trim()) {
      alert("Sale title is required");
      return;
    }

    if (
      !editAmount ||
      Number(editAmount) <= 0
    ) {
      alert("Please enter a valid amount");
      return;
    }

    if (!userId) return;

    setEditLoading(true);

    const { error } = await supabase
      .from("sales")
      .update({
        title: editTitle.trim(),
        amount: Number(editAmount),
        sale_date: editSaleDate || null,
        customer_id:
          editCustomerId || null,
        payment_status:
          editPaymentStatus,
        notes:
          editNotes.trim() || null,
      })
      .eq("id", editingSale.id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
    } else {
      alert("Sale updated successfully! 🎉");

      setEditingSale(null);

      fetchSales();
    }

    setEditLoading(false);
  }

  // =====================================
  // CANCEL EDIT
  // =====================================

  function cancelEdit() {
    setEditingSale(null);

    setEditTitle("");
    setEditAmount("");
    setEditSaleDate("");
    setEditCustomerId("");
    setEditPaymentStatus("Paid");
    setEditNotes("");
  }

  // =====================================
  // UPDATE PAYMENT STATUS
  // =====================================

  async function updatePaymentStatus(
    saleId: string,
    newStatus: string
  ) {
    if (!userId) return;

    const { error } = await supabase
      .from("sales")
      .update({
        payment_status: newStatus,
      })
      .eq("id", saleId)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
    } else {
      fetchSales();
    }
  }

  // =====================================
  // FILTER SALES
  // =====================================

  const filteredSales = useMemo(() => {
    const searchText =
      search.toLowerCase().trim();

    return sales.filter((sale) => {
      const customerName =
        customers.find(
          (customer) =>
            customer.id === sale.customer_id
        )?.name || "";

      const matchesSearch =
        !searchText ||
        sale.title
          .toLowerCase()
          .includes(searchText) ||
        sale.notes
          ?.toLowerCase()
          .includes(searchText) ||
        customerName
          .toLowerCase()
          .includes(searchText);

      const matchesPayment =
        filterPayment === "All" ||
        sale.payment_status ===
          filterPayment;

      return (
        matchesSearch &&
        matchesPayment
      );
    });
  }, [
    sales,
    customers,
    search,
    filterPayment,
  ]);

  // =====================================
  // GET CUSTOMER NAME
  // =====================================

  function getCustomerName(
    customerId: string | null
  ) {
    if (!customerId) {
      return null;
    }

    return customers.find(
      (customer) =>
        customer.id === customerId
    )?.name;
  }

  // =====================================
  // FORMAT MONEY
  // =====================================

  function formatMoney(amount: number) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }
    ).format(amount);
  }

  // =====================================
  // REVENUE CALCULATIONS
  // =====================================

  const totalRevenue = sales.reduce(
    (total, sale) =>
      total + Number(sale.amount),
    0
  );

  const paidRevenue = sales
    .filter(
      (sale) =>
        sale.payment_status === "Paid"
    )
    .reduce(
      (total, sale) =>
        total + Number(sale.amount),
      0
    );

  const pendingRevenue = sales
    .filter(
      (sale) =>
        sale.payment_status === "Pending"
    )
    .reduce(
      (total, sale) =>
        total + Number(sale.amount),
      0
    );

  const partialRevenue = sales
    .filter(
      (sale) =>
        sale.payment_status === "Partial"
    )
    .reduce(
      (total, sale) =>
        total + Number(sale.amount),
      0
    );

  const totalSales = sales.length;

  // =====================================
  // MONTHLY SALES ANALYTICS
  // =====================================

  const monthlySales = sales.reduce(
    (acc: Record<string, number>, sale) => {
      if (!sale.sale_date) return acc;

      const date = new Date(
        sale.sale_date
      );

      const month =
        date.toLocaleString(
          "en-IN",
          {
            month: "short",
            year: "numeric",
          }
        );

      acc[month] =
        (acc[month] || 0) +
        Number(sale.amount);

      return acc;
    },
    {}
  );

  const monthlySalesData =
    Object.entries(monthlySales).map(
      ([month, amount]) => ({
        month,
        amount,
      })
    );

  // =====================================
  // PAYMENT ANALYTICS
  // =====================================

  const paymentAnalytics = [
    {
      status: "Paid",
      amount: paidRevenue,
    },
    {
      status: "Pending",
      amount: pendingRevenue,
    },
    {
      status: "Partial",
      amount: partialRevenue,
    },
  ];

  // =====================================
  // PAYMENT COLOR
  // =====================================

  function getPaymentColor(status: string) {
    switch (status) {
      case "Paid":
        return "bg-green-600";

      case "Pending":
        return "bg-yellow-600";

      case "Partial":
        return "bg-orange-600";

      default:
        return "bg-slate-600";
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">

      <div className="max-w-7xl mx-auto">

        {/* ================================= */}
        {/* HEADER */}
        {/* ================================= */}

        <h1 className="text-3xl font-bold mb-2">
          💰 Sales & Revenue
        </h1>

        <p className="text-slate-400 mb-8">
          Track your business sales and revenue
        </p>


        {/* ================================= */}
        {/* EDIT SALE */}
        {/* ================================= */}

        {editingSale && (

          <div className="bg-slate-900 border border-blue-500 rounded-xl p-6 mb-10">

            <div className="flex justify-between items-center mb-6">

              <div>

                <h2 className="text-xl font-semibold">
                  ✏️ Edit Sale
                </h2>

                <p className="text-slate-400 text-sm mt-1">
                  Update sale information
                </p>

              </div>

              <button
                onClick={cancelEdit}
                className="text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>

            </div>


            <form onSubmit={updateSale}>

              <input
                type="text"
                placeholder="Sale Title *"
                value={editTitle}
                onChange={(e) =>
                  setEditTitle(e.target.value)
                }
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />


              <input
                type="number"
                placeholder="Sale Amount ₹ *"
                value={editAmount}
                onChange={(e) =>
                  setEditAmount(e.target.value)
                }
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />


              <input
                type="date"
                value={editSaleDate}
                onChange={(e) =>
                  setEditSaleDate(
                    e.target.value
                  )
                }
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />


              <select
                value={editCustomerId}
                onChange={(e) =>
                  setEditCustomerId(
                    e.target.value
                  )
                }
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              >

                <option value="">
                  👤 No Customer
                </option>

                {customers.map((customer) => (

                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    👤 {customer.name}
                  </option>

                ))}

              </select>


              <select
                value={editPaymentStatus}
                onChange={(e) =>
                  setEditPaymentStatus(
                    e.target.value
                  )
                }
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              >

                <option value="Paid">
                  ✅ Paid
                </option>

                <option value="Pending">
                  ⏳ Pending
                </option>

                <option value="Partial">
                  💰 Partial
                </option>

              </select>


              <textarea
                placeholder="Notes"
                value={editNotes}
                onChange={(e) =>
                  setEditNotes(e.target.value)
                }
                className="w-full p-3 mb-6 rounded-lg bg-slate-950 border border-slate-700 text-white min-h-[100px]"
              />


              <div className="flex gap-4">

                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold"
                >
                  {editLoading
                    ? "Updating..."
                    : "💾 Save Changes"}
                </button>


                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 border border-slate-700 p-3 rounded-lg"
                >
                  Cancel
                </button>

              </div>

            </form>

          </div>

        )}


        {/* ================================= */}
        {/* REVENUE STATS */}
        {/* ================================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              💰 Total Revenue
            </p>

            <h2 className="text-2xl font-bold mt-2">
              {formatMoney(totalRevenue)}
            </h2>

          </div>


          <div className="bg-slate-900 border border-green-500/30 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              ✅ Paid Revenue
            </p>

            <h2 className="text-2xl font-bold text-green-400 mt-2">
              {formatMoney(paidRevenue)}
            </h2>

          </div>


          <div className="bg-slate-900 border border-yellow-500/30 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              ⏳ Pending Revenue
            </p>

            <h2 className="text-2xl font-bold text-yellow-400 mt-2">
              {formatMoney(pendingRevenue)}
            </h2>

          </div>


          <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              📊 Total Sales
            </p>

            <h2 className="text-3xl font-bold text-blue-400 mt-2">
              {totalSales}
            </h2>

          </div>

        </div>


        {/* ================================= */}
        {/* SALES ANALYTICS */}
        {/* ================================= */}

        <div className="mb-10">

          <div className="mb-6">

            <h2 className="text-2xl font-bold">
              📊 Sales Analytics
            </h2>

            <p className="text-slate-400 text-sm mt-1">
              Understand your business revenue performance
            </p>

          </div>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


            {/* PAYMENT STATUS ANALYTICS */}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

              <h3 className="text-lg font-semibold mb-6">
                💳 Revenue by Payment Status
              </h3>


              {totalRevenue === 0 ? (

                <p className="text-slate-400">
                  No revenue data available yet.
                </p>

              ) : (

                <div className="space-y-5">

                  {paymentAnalytics.map((item) => {

                    const percentage =
                      totalRevenue > 0
                        ? Math.round(
                            (item.amount /
                              totalRevenue) *
                              100
                          )
                        : 0;

                    return (

                      <div key={item.status}>

                        <div className="flex justify-between mb-2">

                          <span className="text-slate-300">
                            {item.status}
                          </span>

                          <span className="font-semibold">

                            {formatMoney(
                              item.amount
                            )}

                            {" "}

                            <span className="text-slate-500 text-sm">

                              ({percentage}%)

                            </span>

                          </span>

                        </div>


                        <div className="w-full bg-slate-800 rounded-full h-3">

                          <div
                            className={`h-3 rounded-full transition-all ${
                              item.status === "Paid"
                                ? "bg-green-500"
                                : item.status === "Pending"
                                ? "bg-yellow-500"
                                : "bg-orange-500"
                            }`}
                            style={{
                              width: `${percentage}%`,
                            }}
                          />

                        </div>

                      </div>

                    );

                  })}

                </div>

              )}

            </div>


            {/* MONTHLY SALES ANALYTICS */}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

              <h3 className="text-lg font-semibold mb-6">
                📅 Monthly Revenue
              </h3>


              {monthlySalesData.length === 0 ? (

                <p className="text-slate-400">
                  No monthly sales data available.
                </p>

              ) : (

                <div className="space-y-5">

                  {monthlySalesData.map(
                    (item) => {

                      const maxAmount =
                        Math.max(
                          ...monthlySalesData.map(
                            (data) =>
                              data.amount
                          )
                        );

                      const percentage =
                        maxAmount > 0
                          ? Math.round(
                              (item.amount /
                                maxAmount) *
                                100
                            )
                          : 0;

                      return (

                        <div
                          key={item.month}
                        >

                          <div className="flex justify-between mb-2">

                            <span className="text-slate-300">
                              {item.month}
                            </span>

                            <span className="font-semibold text-green-400">

                              {formatMoney(
                                item.amount
                              )}

                            </span>

                          </div>


                          <div className="w-full bg-slate-800 rounded-full h-3">

                            <div
                              className="bg-green-500 h-3 rounded-full transition-all"
                              style={{
                                width: `${percentage}%`,
                              }}
                            />

                          </div>

                        </div>

                      );

                    }
                  )}

                </div>

              )}

            </div>


          </div>

        </div>


        {/* ================================= */}
        {/* ADD SALE */}
        {/* ================================= */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-10">

          <h2 className="text-xl font-semibold mb-6">
            ➕ Add New Sale
          </h2>


          <form onSubmit={addSale}>

            <input
              type="text"
              placeholder="Sale Title *"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
            />


            <input
              type="number"
              placeholder="Sale Amount ₹ *"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value)
              }
              className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
            />


            <input
              type="date"
              value={saleDate}
              onChange={(e) =>
                setSaleDate(e.target.value)
              }
              className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
            />


            <select
              value={customerId}
              onChange={(e) =>
                setCustomerId(e.target.value)
              }
              className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
            >

              <option value="">
                👤 Link Customer (Optional)
              </option>

              {customers.map((customer) => (

                <option
                  key={customer.id}
                  value={customer.id}
                >
                  👤 {customer.name}
                </option>

              ))}

            </select>


            <select
              value={paymentStatus}
              onChange={(e) =>
                setPaymentStatus(e.target.value)
              }
              className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
            >

              <option value="Paid">
                ✅ Paid
              </option>

              <option value="Pending">
                ⏳ Pending
              </option>

              <option value="Partial">
                💰 Partial Payment
              </option>

            </select>


            <textarea
              placeholder="Notes (Optional)"
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              className="w-full p-3 mb-6 rounded-lg bg-slate-950 border border-slate-700 text-white min-h-[100px]"
            />


            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {loading
                ? "Adding Sale..."
                : "💰 Add Sale"}
            </button>

          </form>

        </div>


        {/* ================================= */}
        {/* SEARCH AND FILTER */}
        {/* ================================= */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <input
              type="text"
              placeholder="🔎 Search sales..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
            />


            <select
              value={filterPayment}
              onChange={(e) =>
                setFilterPayment(
                  e.target.value
                )
              }
              className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
            >

              <option value="All">
                All Payments
              </option>

              <option value="Paid">
                ✅ Paid
              </option>

              <option value="Pending">
                ⏳ Pending
              </option>

              <option value="Partial">
                💰 Partial
              </option>

            </select>

          </div>

        </div>


        {/* ================================= */}
        {/* SALES LIST */}
        {/* ================================= */}

        <div className="flex justify-between items-center mb-6">

          <div>

            <h2 className="text-2xl font-semibold">
              Your Sales
            </h2>

            <p className="text-slate-400 text-sm mt-1">

              Showing {filteredSales.length} of{" "}
              {sales.length} sales

            </p>

          </div>


          <button
            onClick={() => fetchSales()}
            className="text-blue-400 hover:text-blue-300"
          >
            🔄 Refresh
          </button>

        </div>


        {sales.length === 0 ? (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">

            No sales yet.

            <br />

            Add your first sale! 💰

          </div>

        ) : filteredSales.length === 0 ? (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">

            🔎 No sales found.

          </div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {filteredSales.map((sale) => (

              <div
                key={sale.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6"
              >

                <div className="flex justify-between items-start gap-3 mb-4">

                  <h3 className="text-xl font-bold">
                    💰 {sale.title}
                  </h3>


                  <span
                    className={`${getPaymentColor(
                      sale.payment_status
                    )} px-3 py-1 rounded-full text-xs whitespace-nowrap`}
                  >
                    {sale.payment_status}
                  </span>

                </div>


                <p className="text-2xl font-bold text-green-400 mb-4">

                  {formatMoney(
                    Number(sale.amount)
                  )}

                </p>


                <div className="space-y-2 mb-5">

                  {sale.sale_date && (

                    <p className="text-slate-300">
                      📅 Date: {sale.sale_date}
                    </p>

                  )}


                  {getCustomerName(
                    sale.customer_id
                  ) && (

                    <p className="text-slate-300">

                      👤 Customer:{" "}

                      {getCustomerName(
                        sale.customer_id
                      )}

                    </p>

                  )}


                  {sale.notes && (

                    <p className="text-slate-400">

                      📝 {sale.notes}

                    </p>

                  )}

                </div>


                {/* PAYMENT STATUS */}

                <select
                  value={sale.payment_status}
                  onChange={(e) =>
                    updatePaymentStatus(
                      sale.id,
                      e.target.value
                    )
                  }
                  className="w-full p-2 mb-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >

                  <option value="Paid">
                    ✅ Paid
                  </option>

                  <option value="Pending">
                    ⏳ Pending
                  </option>

                  <option value="Partial">
                    💰 Partial
                  </option>

                </select>


                {/* ACTIONS */}

                <div className="grid grid-cols-2 gap-3">

                  <button
                    onClick={() =>
                      openEditSale(sale)
                    }
                    className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg"
                  >
                    ✏️ Edit
                  </button>


                  <button
                    onClick={() =>
                      deleteSale(sale.id)
                    }
                    className="bg-red-600 hover:bg-red-700 p-2 rounded-lg"
                  >
                    🗑 Delete
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </main>
  );
}