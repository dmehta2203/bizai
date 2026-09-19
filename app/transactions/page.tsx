"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Transaction = {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: "Income" | "Expense";
  category: string | null;
  transaction_date: string;
  notes: string | null;
  created_at: string;
};

const INCOME_CATEGORIES = [
  "Sales",
  "Service",
  "Consulting",
  "Commission",
  "Other",
];

const EXPENSE_CATEGORIES = [
  "Rent",
  "Salary",
  "Marketing",
  "Travel",
  "Office",
  "Software",
  "Utilities",
  "Other",
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // ADD TRANSACTION
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"Income" | "Expense">("Income");
  const [category, setCategory] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // SEARCH & FILTER
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");

  // EDIT TRANSACTION
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] =
    useState<"Income" | "Expense">("Income");
  const [editCategory, setEditCategory] = useState("");
  const [editTransactionDate, setEditTransactionDate] =
    useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    loadUserAndTransactions();
  }, []);

  // LOAD USER

  async function loadUserAndTransactions() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      setUserId(session.user.id);
      fetchTransactions(session.user.id);
    } else {
      window.location.href = "/login";
    }
  }

  // FETCH TRANSACTIONS

  async function fetchTransactions(currentUserId?: string) {
    const id = currentUserId || userId;

    if (!id) return;

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", id)
      .order("transaction_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error fetching transactions:",
        error.message
      );
    } else {
      setTransactions(data || []);
    }
  }

  // ADD TRANSACTION

  async function addTransaction(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!title.trim()) {
      alert("Transaction title is required");
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
      .from("transactions")
      .insert([
        {
          user_id: userId,
          title: title.trim(),
          amount: Number(amount),
          type: type,
          category: category || null,
          transaction_date:
            transactionDate ||
            new Date().toISOString().split("T")[0],
          notes: notes.trim() || null,
        },
      ]);

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      alert(
        `${type} added successfully! 🎉`
      );

      setTitle("");
      setAmount("");
      setType("Income");
      setCategory("");
      setTransactionDate("");
      setNotes("");

      fetchTransactions();
    }

    setLoading(false);
  }

  // DELETE TRANSACTION

  async function deleteTransaction(id: string) {
    const confirmed = confirm(
      "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) return;

    if (!userId) return;

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
    } else {
      fetchTransactions();
    }
  }

  // OPEN EDIT

  function openEditTransaction(
    transaction: Transaction
  ) {
    setEditingTransaction(transaction);

    setEditTitle(transaction.title);
    setEditAmount(
      String(transaction.amount)
    );
    setEditType(transaction.type);
    setEditCategory(
      transaction.category || ""
    );
    setEditTransactionDate(
      transaction.transaction_date || ""
    );
    setEditNotes(transaction.notes || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // UPDATE TRANSACTION

  async function updateTransaction(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!editingTransaction) return;

    if (!editTitle.trim()) {
      alert("Transaction title is required");
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
      .from("transactions")
      .update({
        title: editTitle.trim(),
        amount: Number(editAmount),
        type: editType,
        category:
          editCategory || null,
        transaction_date:
          editTransactionDate,
        notes:
          editNotes.trim() || null,
      })
      .eq("id", editingTransaction.id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
    } else {
      alert(
        "Transaction updated successfully! 🎉"
      );

      cancelEdit();
      fetchTransactions();
    }

    setEditLoading(false);
  }

  // CANCEL EDIT

  function cancelEdit() {
    setEditingTransaction(null);
    setEditTitle("");
    setEditAmount("");
    setEditType("Income");
    setEditCategory("");
    setEditTransactionDate("");
    setEditNotes("");
  }

  // FILTER TRANSACTIONS

  const filteredTransactions = useMemo(() => {
    const searchText =
      search.toLowerCase().trim();

    return transactions.filter(
      (transaction) => {
        const matchesSearch =
          !searchText ||
          transaction.title
            .toLowerCase()
            .includes(searchText) ||
          transaction.category
            ?.toLowerCase()
            .includes(searchText) ||
          transaction.notes
            ?.toLowerCase()
            .includes(searchText);

        const matchesType =
          filterType === "All" ||
          transaction.type === filterType;

        const matchesCategory =
          filterCategory === "All" ||
          transaction.category ===
            filterCategory;

        return (
          matchesSearch &&
          matchesType &&
          matchesCategory
        );
      }
    );
  }, [
    transactions,
    search,
    filterType,
    filterCategory,
  ]);

  // CALCULATE TOTALS

  const totalIncome = transactions
    .filter(
      (transaction) =>
        transaction.type === "Income"
    )
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

  const totalExpense = transactions
    .filter(
      (transaction) =>
        transaction.type === "Expense"
    )
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

  const profit =
    totalIncome - totalExpense;

  // GET AVAILABLE CATEGORIES

  const currentCategories =
    type === "Income"
      ? INCOME_CATEGORIES
      : EXPENSE_CATEGORIES;

  const editCategories =
    editType === "Income"
      ? INCOME_CATEGORIES
      : EXPENSE_CATEGORIES;

  const allCategories = Array.from(
    new Set([
      ...INCOME_CATEGORIES,
      ...EXPENSE_CATEGORIES,
    ])
  );

  // FORMAT CURRENCY

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }
    ).format(amount);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <h1 className="text-3xl font-bold mb-2">
          💰 Revenue & Expense Tracker
        </h1>

        <p className="text-slate-400 mb-8">
          Track your business income,
          expenses and profit
        </p>


        {/* EDIT TRANSACTION */}

        {editingTransaction && (

          <div className="bg-slate-900 border border-blue-500 rounded-xl p-6 mb-10">

            <div className="flex justify-between items-center mb-6">

              <div>

                <h2 className="text-xl font-semibold">
                  ✏️ Edit Transaction
                </h2>

                <p className="text-slate-400 text-sm mt-1">
                  Update transaction details
                </p>

              </div>

              <button
                onClick={cancelEdit}
                className="text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>

            </div>


            <form onSubmit={updateTransaction}>

              <input
                type="text"
                placeholder="Transaction Title *"
                value={editTitle}
                onChange={(e) =>
                  setEditTitle(e.target.value)
                }
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />


              <input
                type="number"
                placeholder="Amount *"
                value={editAmount}
                onChange={(e) =>
                  setEditAmount(e.target.value)
                }
                min="0"
                step="0.01"
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />


              <select
                value={editType}
                onChange={(e) => {
                  setEditType(
                    e.target.value as
                      | "Income"
                      | "Expense"
                  );
                  setEditCategory("");
                }}
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              >
                <option value="Income">
                  💰 Income
                </option>

                <option value="Expense">
                  💸 Expense
                </option>
              </select>


              <select
                value={editCategory}
                onChange={(e) =>
                  setEditCategory(e.target.value)
                }
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              >

                <option value="">
                  Select Category
                </option>

                {editCategories.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>


              <input
                type="date"
                value={editTransactionDate}
                onChange={(e) =>
                  setEditTransactionDate(
                    e.target.value
                  )
                }
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />


              <textarea
                placeholder="Notes (Optional)"
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


        {/* FINANCIAL STATS */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">

          <div className="bg-slate-900 border border-green-500/30 rounded-xl p-6">

            <p className="text-slate-400">
              💰 Total Income
            </p>

            <h2 className="text-3xl font-bold text-green-400 mt-2">
              {formatCurrency(totalIncome)}
            </h2>

          </div>


          <div className="bg-slate-900 border border-red-500/30 rounded-xl p-6">

            <p className="text-slate-400">
              💸 Total Expenses
            </p>

            <h2 className="text-3xl font-bold text-red-400 mt-2">
              {formatCurrency(totalExpense)}
            </h2>

          </div>


          <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-6">

            <p className="text-slate-400">
              📈 Net Profit
            </p>

            <h2
              className={`text-3xl font-bold mt-2 ${
                profit >= 0
                  ? "text-blue-400"
                  : "text-red-400"
              }`}
            >
              {formatCurrency(profit)}
            </h2>

          </div>

        </div>


        {/* ADD TRANSACTION */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-10">

          <h2 className="text-xl font-semibold mb-6">
            ➕ Add Transaction
          </h2>


          <form onSubmit={addTransaction}>

            <input
              type="text"
              placeholder="Transaction Title *"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
            />


            <input
              type="number"
              placeholder="Amount (₹) *"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value)
              }
              min="0"
              step="0.01"
              className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
            />


            <select
              value={type}
              onChange={(e) => {
                setType(
                  e.target.value as
                    | "Income"
                    | "Expense"
                );
                setCategory("");
              }}
              className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
            >
              <option value="Income">
                💰 Income
              </option>

              <option value="Expense">
                💸 Expense
              </option>
            </select>


            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
            >

              <option value="">
                Select Category (Optional)
              </option>

              {currentCategories.map((item) => (

                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>

              ))}

            </select>


            <input
              type="date"
              value={transactionDate}
              onChange={(e) =>
                setTransactionDate(
                  e.target.value
                )
              }
              className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
            />


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
              className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {loading
                ? "Adding..."
                : "➕ Add Transaction"}
            </button>

          </form>

        </div>


        {/* SEARCH & FILTER */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <input
              type="text"
              placeholder="🔎 Search transactions..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
            />


            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setFilterCategory("All");
              }}
              className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
            >
              <option value="All">
                All Types
              </option>

              <option value="Income">
                💰 Income
              </option>

              <option value="Expense">
                💸 Expense
              </option>
            </select>


            <select
              value={filterCategory}
              onChange={(e) =>
                setFilterCategory(e.target.value)
              }
              className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
            >

              <option value="All">
                All Categories
              </option>

              {allCategories.map((item) => (

                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>

              ))}

            </select>

          </div>


          {(search ||
            filterType !== "All" ||
            filterCategory !== "All") && (

            <button
              onClick={() => {
                setSearch("");
                setFilterType("All");
                setFilterCategory("All");
              }}
              className="mt-4 border border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-800"
            >
              ✕ Clear Filters
            </button>

          )}

        </div>


        {/* TRANSACTION LIST */}

        <div className="flex justify-between items-center mb-6">

          <div>

            <h2 className="text-2xl font-semibold">
              Transaction History
            </h2>

            <p className="text-slate-400 text-sm mt-1">
              Showing {filteredTransactions.length} of{" "}
              {transactions.length} transactions
            </p>

          </div>


          <button
            onClick={() =>
              fetchTransactions()
            }
            className="text-blue-400 hover:text-blue-300"
          >
            🔄 Refresh
          </button>

        </div>


        {transactions.length === 0 ? (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">

            No transactions yet.

            <br />

            Add your first income or expense! 💰

          </div>

        ) : filteredTransactions.length === 0 ? (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">

            🔎 No transactions found.

          </div>

        ) : (

          <div className="space-y-4">

            {filteredTransactions.map(
              (transaction) => (

                <div
                  key={transaction.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >

                  <div className="flex items-start gap-4">

                    <div className="text-3xl">

                      {transaction.type ===
                      "Income"
                        ? "💰"
                        : "💸"}

                    </div>


                    <div>

                      <h3 className="font-bold text-lg">
                        {transaction.title}
                      </h3>


                      <div className="flex flex-wrap gap-2 mt-2">

                        <span
                          className={`px-3 py-1 rounded-full text-xs ${
                            transaction.type ===
                            "Income"
                              ? "bg-green-600"
                              : "bg-red-600"
                          }`}
                        >
                          {transaction.type}
                        </span>


                        {transaction.category && (

                          <span className="bg-slate-700 px-3 py-1 rounded-full text-xs">
                            📂 {transaction.category}
                          </span>

                        )}

                      </div>


                      {transaction.notes && (

                        <p className="text-slate-400 text-sm mt-3">
                          📝 {transaction.notes}
                        </p>

                      )}


                      <p className="text-slate-500 text-sm mt-3">
                        📅 {transaction.transaction_date}
                      </p>

                    </div>

                  </div>


                  <div className="flex flex-col md:items-end gap-3">

                    <h2
                      className={`text-2xl font-bold ${
                        transaction.type ===
                        "Income"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {transaction.type ===
                      "Income"
                        ? "+"
                        : "-"}

                      {formatCurrency(
                        Number(
                          transaction.amount
                        )
                      )}
                    </h2>


                    <div className="flex gap-3">

                      <button
                        onClick={() =>
                          openEditTransaction(
                            transaction
                          )
                        }
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
                      >
                        ✏️ Edit
                      </button>


                      <button
                        onClick={() =>
                          deleteTransaction(
                            transaction.id
                          )
                        }
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm"
                      >
                        🗑 Delete
                      </button>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </main>
  );
}