"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import FeatureGuard from "@/components/FeatureGuard";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Lead = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  follow_up_date: string | null;
  follow_up_priority: string | null;
  follow_up_notes: string | null;
  follow_up_completed: boolean;
};

type FollowUpFilter =
  | "all"
  | "overdue"
  | "today"
  | "upcoming"
  | "no-date"
  | "completed";

export default function FollowUpsPage() {
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [generatingId, setGeneratingId] =
    useState<string | null>(null);

  const [aiMessages, setAiMessages] =
    useState<Record<string, string>>({});

  const [copiedId, setCopiedId] =
    useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [filter, setFilter] =
    useState<FollowUpFilter>("all");

  const [savingId, setSavingId] =
    useState<string | null>(null);

  // =====================================
  // LOAD USER + LEADS
  // =====================================

  useEffect(() => {
    loadUserAndLeads();
  }, []);

  async function loadUserAndLeads() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.push("/login");
      return;
    }

    setUserId(session.user.id);

    await fetchLeads(session.user.id);

    setLoading(false);
  }

  // =====================================
  // FETCH LEADS
  // =====================================

  async function fetchLeads(
    currentUserId?: string
  ) {
    const id = currentUserId || userId;

    if (!id) return;

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", id)
      .order("follow_up_date", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Error loading follow-ups:",
        error
      );

      alert(error.message);

      return;
    }

    setLeads(data || []);
  }

  // =====================================
  // REFRESH
  // =====================================

  async function refreshLeads() {
    if (!userId) return;

    setRefreshing(true);

    await fetchLeads();

    setRefreshing(false);
  }

  // =====================================
  // GET TODAY
  // =====================================

  function getToday() {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(
      today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const today = getToday();

  // =====================================
  // UPDATE FOLLOW-UP
  // =====================================

  async function updateFollowUp(
    id: string,
    field: string,
    value: string | boolean | null
  ) {
    if (!userId) {
      alert("Please login first");
      return;
    }

    setSavingId(id);

    const { error } = await supabase
      .from("leads")
      .update({
        [field]: value,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error(error);

      alert(error.message);
    } else {
      await fetchLeads();
    }

    setSavingId(null);
  }

  // =====================================
  // GENERATE AI MESSAGE
  // =====================================

  async function generateAIMessage(
    lead: Lead
  ) {
    setGeneratingId(lead.id);

    try {
      const response = await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            followUpLead: lead,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to generate message"
        );
      }

      setAiMessages((current) => ({
        ...current,

        [lead.id]: data.reply,
      }));
    } catch (error) {
      console.error(error);

      alert(
        "Could not generate AI message. Please try again."
      );
    } finally {
      setGeneratingId(null);
    }
  }

  // =====================================
  // COPY MESSAGE
  // =====================================

  async function copyMessage(id: string) {
    const message = aiMessages[id];

    if (!message) return;

    try {
      await navigator.clipboard.writeText(
        message
      );

      setCopiedId(id);

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      console.error(error);

      alert("Could not copy message.");
    }
  }

  // =====================================
  // OPEN WHATSAPP
  // =====================================

  function openWhatsApp(lead: Lead) {
    const message =
      aiMessages[lead.id];

    if (!message) {
      alert(
        "Please generate an AI message first."
      );

      return;
    }

    if (!lead.phone) {
      alert(
        "This lead does not have a phone number."
      );

      return;
    }

    let phone = lead.phone.replace(
      /\D/g,
      ""
    );

    if (phone.startsWith("0")) {
      phone = phone.substring(1);
    }

    if (phone.length === 10) {
      phone = "91" + phone;
    }

    const encodedMessage =
      encodeURIComponent(message);

    const whatsappUrl =
      `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // =====================================
  // PRIORITY STYLE
  // =====================================

  function getPriorityStyle(
    priority: string | null
  ) {
    if (priority === "High") {
      return "bg-red-500/10 border-red-500 text-red-400";
    }

    if (priority === "Medium") {
      return "bg-yellow-500/10 border-yellow-500 text-yellow-400";
    }

    return "bg-green-500/10 border-green-500 text-green-400";
  }

  // =====================================
  // FOLLOW-UP STATUS
  // =====================================

  function getFollowUpStatus(
    lead: Lead
  ) {
    if (!lead.follow_up_date) {
      return {
        text: "⚪ No Date",

        style:
          "bg-slate-700 text-slate-300 border border-slate-600",
      };
    }

    if (
      lead.follow_up_date < today
    ) {
      return {
        text: "🔴 OVERDUE",

        style:
          "bg-red-500/20 text-red-400 border border-red-500/50",
      };
    }

    if (
      lead.follow_up_date === today
    ) {
      return {
        text: "🟠 DUE TODAY",

        style:
          "bg-orange-500/20 text-orange-400 border border-orange-500/50",
      };
    }

    return {
      text: "🟡 UPCOMING",

      style:
        "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50",
    };
  }

  // =====================================
  // FORMAT DATE
  // =====================================

  function formatDate(date: string | null) {
    if (!date) {
      return "No date selected";
    }

    const [year, month, day] =
      date.split("-").map(Number);

    const localDate = new Date(
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
  // FOLLOW-UP DATA
  // =====================================

  const pendingLeads = useMemo(() => {
    return leads.filter(
      (lead) =>
        !lead.follow_up_completed
    );
  }, [leads]);

  const completedLeads = useMemo(() => {
    return leads.filter(
      (lead) =>
        lead.follow_up_completed
    );
  }, [leads]);

  const overdueLeads = useMemo(() => {
    return pendingLeads.filter(
      (lead) =>
        lead.follow_up_date &&
        lead.follow_up_date < today
    );
  }, [pendingLeads, today]);

  const dueTodayLeads = useMemo(() => {
    return pendingLeads.filter(
      (lead) =>
        lead.follow_up_date === today
    );
  }, [pendingLeads, today]);

  const upcomingLeads = useMemo(() => {
    return pendingLeads.filter(
      (lead) =>
        lead.follow_up_date &&
        lead.follow_up_date > today
    );
  }, [pendingLeads, today]);

  const noDateLeads = useMemo(() => {
    return pendingLeads.filter(
      (lead) =>
        !lead.follow_up_date
    );
  }, [pendingLeads]);

  // =====================================
  // SORT FOLLOW-UPS
  // =====================================

  const sortedPendingLeads = useMemo(() => {
    return [
      ...overdueLeads,
      ...dueTodayLeads,
      ...upcomingLeads,
      ...noDateLeads,
    ];
  }, [
    overdueLeads,
    dueTodayLeads,
    upcomingLeads,
    noDateLeads,
  ]);

  // =====================================
  // FILTER + SEARCH
  // =====================================

  const displayedLeads = useMemo(() => {
    let result: Lead[] = [];

    switch (filter) {
      case "overdue":
        result = overdueLeads;
        break;

      case "today":
        result = dueTodayLeads;
        break;

      case "upcoming":
        result = upcomingLeads;
        break;

      case "no-date":
        result = noDateLeads;
        break;

      case "completed":
        result = completedLeads;
        break;

      default:
        result = sortedPendingLeads;
    }

    const searchText =
      search.toLowerCase().trim();

    if (!searchText) {
      return result;
    }

    return result.filter(
      (lead) =>
        lead.name
          .toLowerCase()
          .includes(searchText) ||
        lead.phone
          ?.toLowerCase()
          .includes(searchText) ||
        lead.email
          ?.toLowerCase()
          .includes(searchText) ||
        lead.status
          ?.toLowerCase()
          .includes(searchText) ||
        lead.follow_up_notes
          ?.toLowerCase()
          .includes(searchText)
    );
  }, [
    filter,
    search,
    overdueLeads,
    dueTodayLeads,
    upcomingLeads,
    noDateLeads,
    completedLeads,
    sortedPendingLeads,
  ]);

  // =====================================
  // LOADING UI
  // =====================================

  if (loading) {
    return (
      <ProtectedLayout>
        <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

          <div className="text-center">

            <div className="text-5xl mb-4 animate-pulse">
              🔥
            </div>

            <h2 className="text-xl font-semibold">
              Loading Follow-ups...
            </h2>

            <p className="text-slate-400 mt-2">
              Getting your leads ready.
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

      <FeatureGuard feature="followups">

        <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

          <div className="max-w-7xl mx-auto">

            {/* HEADER */}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

              <div>

                <button
                  onClick={() =>
                    router.push("/dashboard")
                  }
                  className="text-blue-400 hover:text-blue-300 mb-4 text-sm"
                >
                  ← Back to Dashboard
                </button>

                <h1 className="text-3xl md:text-4xl font-bold">
                  🔥 Follow-up Management
                </h1>

                <p className="text-slate-400 mt-2">
                  Manage follow-ups and never miss
                  an important business opportunity.
                </p>

              </div>

              <button
                onClick={refreshLeads}
                disabled={refreshing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-3 rounded-xl font-semibold"
              >
                {refreshing
                  ? "🔄 Refreshing..."
                  : "🔄 Refresh Data"}
              </button>

            </div>

            {/* STATS */}

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

                <p className="text-slate-400 text-sm">
                  🔥 Pending
                </p>

                <p className="text-3xl font-bold mt-2">
                  {pendingLeads.length}
                </p>

              </div>

              <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-5">

                <p className="text-red-400 text-sm">
                  🔴 Overdue
                </p>

                <p className="text-3xl font-bold mt-2">
                  {overdueLeads.length}
                </p>

              </div>

              <div className="bg-orange-500/10 border border-orange-500/40 rounded-xl p-5">

                <p className="text-orange-400 text-sm">
                  🟠 Today
                </p>

                <p className="text-3xl font-bold mt-2">
                  {dueTodayLeads.length}
                </p>

              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-xl p-5">

                <p className="text-yellow-400 text-sm">
                  🟡 Upcoming
                </p>

                <p className="text-3xl font-bold mt-2">
                  {upcomingLeads.length}
                </p>

              </div>

              <div className="bg-green-500/10 border border-green-500/40 rounded-xl p-5">

                <p className="text-green-400 text-sm">
                  ✅ Completed
                </p>

                <p className="text-3xl font-bold mt-2">
                  {completedLeads.length}
                </p>

              </div>

            </div>

            {/* OVERDUE ALERT */}

            {overdueLeads.length > 0 && (

              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-5 mb-8">

                <h2 className="text-red-400 font-bold text-lg">

                  🚨 Attention! You have{" "}
                  {overdueLeads.length} overdue
                  follow-up
                  {overdueLeads.length > 1
                    ? "s"
                    : ""}

                </h2>

                <p className="text-slate-300 text-sm mt-2">

                  Contact these leads as soon as
                  possible to avoid losing potential
                  customers.

                </p>

              </div>

            )}

            {/* SEARCH */}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">

              <div className="flex flex-col lg:flex-row gap-4">

                <input
                  type="text"
                  placeholder="🔍 Search by name, phone, email or notes..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  className="flex-1 p-3 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                />

                <select
                  value={filter}
                  onChange={(e) =>
                    setFilter(
                      e.target.value as FollowUpFilter
                    )
                  }
                  className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                >

                  <option value="all">
                    🔥 All Pending
                  </option>

                  <option value="overdue">
                    🔴 Overdue
                  </option>

                  <option value="today">
                    🟠 Due Today
                  </option>

                  <option value="upcoming">
                    🟡 Upcoming
                  </option>

                  <option value="no-date">
                    ⚪ No Date
                  </option>

                  <option value="completed">
                    ✅ Completed
                  </option>

                </select>

                {(search ||
                  filter !== "all") && (

                  <button
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                    className="border border-slate-700 hover:border-red-500 px-5 py-3 rounded-lg transition"
                  >
                    ✕ Clear
                  </button>

                )}

              </div>

            </div>

            {/* FOLLOW-UP LIST */}

            <div className="flex justify-between items-center mb-6">

              <div>

                <h2 className="text-2xl font-bold">

                  {filter === "completed"
                    ? "✅ Completed Follow-ups"
                    : "🔥 Follow-ups"}

                </h2>

                <p className="text-slate-400 text-sm mt-1">

                  Showing{" "}
                  {displayedLeads.length} follow-up
                  {displayedLeads.length !== 1
                    ? "s"
                    : ""}

                </p>

              </div>

            </div>

            {displayedLeads.length === 0 ? (

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">

                <div className="text-5xl mb-4">
                  🎉
                </div>

                <h3 className="text-xl font-semibold">

                  No follow-ups found

                </h3>

                <p className="text-slate-400 mt-2">

                  Try changing your filter or search.

                </p>

              </div>

            ) : (

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                {displayedLeads.map(
                  (lead) => {

                    const followUpStatus =
                      getFollowUpStatus(lead);

                    const isCompleted =
                      lead.follow_up_completed;

                    return (

                      <div
                        key={lead.id}
                        className={`bg-slate-900 border rounded-2xl p-6 transition hover:border-blue-500/50 ${
                          isCompleted
                            ? "border-green-900"
                            : lead.follow_up_date &&
                              lead.follow_up_date <
                                today
                            ? "border-red-500/60"
                            : "border-slate-800"
                        }`}
                      >

                        {/* NAME */}

                        <div className="flex justify-between items-start gap-3 mb-5">

                          <div>

                            <h3 className="text-xl font-bold">

                              👤 {lead.name}

                            </h3>

                            {!isCompleted && (

                              <span
                                className={`inline-block mt-2 px-3 py-1 rounded-full text-xs ${followUpStatus.style}`}
                              >

                                {followUpStatus.text}

                              </span>

                            )}

                            {isCompleted && (

                              <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/40">

                                ✅ COMPLETED

                              </span>

                            )}

                          </div>

                          <span
                            className={`border px-3 py-1 rounded-full text-xs ${
                              getPriorityStyle(
                                lead.follow_up_priority
                              )
                            }`}
                          >

                            {lead.follow_up_priority ||
                              "Medium"}

                          </span>

                        </div>

                        {/* CONTACT */}

                        <div className="space-y-2 mb-5">

                          {lead.phone && (

                            <p className="text-slate-400 text-sm">

                              📞 {lead.phone}

                            </p>

                          )}

                          {lead.email && (

                            <p className="text-slate-400 text-sm break-all">

                              ✉️ {lead.email}

                            </p>

                          )}

                          <p className="text-slate-500 text-xs">

                            Lead Status:{" "}

                            <span className="text-slate-300">

                              {lead.status}

                            </span>

                          </p>

                        </div>

                        {!isCompleted && (

                          <>

                            {/* DATE */}

                            <label className="text-sm text-slate-400">

                              📅 Follow-up Date

                            </label>

                            <input
                              type="date"
                              value={
                                lead.follow_up_date ||
                                ""
                              }
                              disabled={
                                savingId === lead.id
                              }
                              onChange={(e) =>
                                updateFollowUp(
                                  lead.id,
                                  "follow_up_date",
                                  e.target.value ||
                                    null
                                )
                              }
                              className="w-full mt-2 mb-2 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                            />

                            <p className="text-slate-500 text-xs mb-4">

                              {formatDate(
                                lead.follow_up_date
                              )}

                            </p>

                            {/* PRIORITY */}

                            <label className="text-sm text-slate-400">

                              ⚡ Priority

                            </label>

                            <select
                              value={
                                lead.follow_up_priority ||
                                "Medium"
                              }
                              disabled={
                                savingId === lead.id
                              }
                              onChange={(e) =>
                                updateFollowUp(
                                  lead.id,
                                  "follow_up_priority",
                                  e.target.value
                                )
                              }
                              className="w-full mt-2 mb-4 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                            >

                              <option value="High">
                                🔥 High
                              </option>

                              <option value="Medium">
                                ⚡ Medium
                              </option>

                              <option value="Low">
                                🟢 Low
                              </option>

                            </select>

                            {/* NOTES */}

                            <label className="text-sm text-slate-400">

                              📝 Follow-up Notes

                            </label>

                            <textarea
                              value={
                                lead.follow_up_notes ||
                                ""
                              }
                              disabled={
                                savingId === lead.id
                              }
                              onChange={(e) =>
                                updateFollowUp(
                                  lead.id,
                                  "follow_up_notes",
                                  e.target.value
                                )
                              }
                              placeholder="Add follow-up notes..."
                              className="w-full mt-2 mb-4 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500 min-h-[100px] disabled:opacity-50"
                            />

                            {/* AI BUTTON */}

                            <button
                              onClick={() =>
                                generateAIMessage(
                                  lead
                                )
                              }
                              disabled={
                                generatingId ===
                                lead.id
                              }
                              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 p-3 rounded-xl font-semibold mb-3"
                            >

                              {generatingId ===
                              lead.id
                                ? "🤖 Generating..."
                                : "🤖 Generate AI Message"}

                            </button>

                            {/* AI MESSAGE */}

                            {aiMessages[lead.id] && (

                              <div className="bg-slate-950 border border-purple-500/40 rounded-xl p-4 mb-3">

                                <p className="text-purple-400 text-xs font-semibold mb-2">

                                  🤖 BizAI Suggested Message

                                </p>

                                <p className="text-sm text-slate-300 whitespace-pre-wrap">

                                  {aiMessages[
                                    lead.id
                                  ]}

                                </p>

                              </div>

                            )}

                            {/* COPY */}

                            {aiMessages[lead.id] && (

                              <button
                                onClick={() =>
                                  copyMessage(
                                    lead.id
                                  )
                                }
                                className="w-full border border-purple-500 hover:bg-purple-500/10 p-3 rounded-xl font-semibold mb-3"
                              >

                                {copiedId ===
                                lead.id
                                  ? "✅ Copied!"
                                  : "📋 Copy Message"}

                              </button>

                            )}

                            {/* WHATSAPP */}

                            {aiMessages[lead.id] && (

                              <button
                                onClick={() =>
                                  openWhatsApp(
                                    lead
                                  )
                                }
                                className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-xl font-semibold mb-3"
                              >

                                📱 Send via WhatsApp

                              </button>

                            )}

                            {/* COMPLETE */}

                            <button
                              onClick={() =>
                                updateFollowUp(
                                  lead.id,
                                  "follow_up_completed",
                                  true
                                )
                              }
                              disabled={
                                savingId === lead.id
                              }
                              className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 p-3 rounded-xl font-semibold"
                            >

                              {savingId ===
                              lead.id
                                ? "Saving..."
                                : "✅ Mark Follow-up Complete"}

                            </button>

                          </>

                        )}

                        {/* COMPLETED ACTIONS */}

                        {isCompleted && (

                          <>

                            {lead.follow_up_date && (

                              <div className="bg-slate-950 rounded-xl p-4 mt-4 mb-4">

                                <p className="text-slate-400 text-xs">

                                  Follow-up Date

                                </p>

                                <p className="text-white mt-1">

                                  📅{" "}

                                  {formatDate(
                                    lead.follow_up_date
                                  )}

                                </p>

                              </div>

                            )}

                            {lead.follow_up_notes && (

                              <div className="bg-slate-950 rounded-xl p-4 mb-4">

                                <p className="text-slate-400 text-xs mb-2">

                                  Notes

                                </p>

                                <p className="text-slate-300 text-sm">

                                  {lead.follow_up_notes}

                                </p>

                              </div>

                            )}

                            <button
                              onClick={() =>
                                updateFollowUp(
                                  lead.id,
                                  "follow_up_completed",
                                  false
                                )
                              }
                              disabled={
                                savingId === lead.id
                              }
                              className="w-full border border-blue-500 text-blue-400 hover:bg-blue-500/10 disabled:opacity-50 p-3 rounded-xl font-semibold"
                            >

                              🔄 Move Back to Pending

                            </button>

                          </>

                        )}

                      </div>

                    );
                  }
                )}

              </div>

            )}

            {/* FOOTER */}

            <div className="text-center text-slate-500 text-sm mt-12 pb-5">

              🔥 BizAI Follow-up Management • Never miss an important business opportunity

            </div>

          </div>

        </main>

      </FeatureGuard>

    </ProtectedLayout>
  );
}