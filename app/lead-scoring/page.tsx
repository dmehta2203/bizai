"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Lead = {
  id: string;
  name: string;
  status: string;
  follow_up_priority: string | null;
  follow_up_notes: string | null;
  created_at: string;
};

type FollowUp = {
  id: string;
  lead_id: string | null;
  title: string;
  due_date: string | null;
  completed: boolean;
};

type ScoredLead = Lead & {
  score: number;
  category: "Hot" | "Warm" | "Cold";
  reason: string[];
  action: string;
};

export default function LeadScoringPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // LOAD DATA
  // =========================

  async function loadData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "/login";
      return;
    }

    const userId = session.user.id;

    const [leadsResult, followUpsResult] =
      await Promise.all([
        supabase
          .from("leads")
          .select(
            "id, name, status, follow_up_priority, follow_up_notes, created_at"
          )
          .eq("user_id", userId),

        supabase
          .from("follow_ups")
          .select(
            "id, lead_id, title, due_date, completed"
          )
          .eq("user_id", userId),
      ]);

    if (leadsResult.error) {
      console.error(
        "Leads error:",
        leadsResult.error.message
      );
    }

    if (followUpsResult.error) {
      console.error(
        "Follow-ups error:",
        followUpsResult.error.message
      );
    }

    setLeads(leadsResult.data || []);
    setFollowUps(followUpsResult.data || []);

    setLoading(false);
    setRefreshing(false);
  }

  // =========================
  // DATE HELPERS
  // =========================

  function getToday() {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return today;
  }

  function isOverdue(date: string | null) {
    if (!date) return false;

    const today = getToday();

    const itemDate = new Date(date);

    itemDate.setHours(0, 0, 0, 0);

    return itemDate < today;
  }

  // =========================
  // SCORE LEAD
  // =========================

  function scoreLead(lead: Lead): ScoredLead {
    let score = 0;

    const reasons: string[] = [];

    // =====================
    // LEAD STATUS SCORE
    // =====================

    if (lead.status === "Converted") {
      score += 100;

      reasons.push(
        "Lead has already been converted"
      );
    }

    else if (lead.status === "Negotiation") {
      score += 80;

      reasons.push(
        "Lead is currently in negotiation"
      );
    }

    else if (lead.status === "Interested") {
      score += 70;

      reasons.push(
        "Lead has shown interest"
      );
    }

    else if (lead.status === "Contacted") {
      score += 45;

      reasons.push(
        "Lead has already been contacted"
      );
    }

    else if (lead.status === "New") {
      score += 30;

      reasons.push(
        "New lead waiting for qualification"
      );
    }

    // =====================
    // PRIORITY SCORE
    // =====================

    if (
      lead.follow_up_priority === "High"
    ) {
      score += 15;

      reasons.push(
        "Marked as high priority"
      );
    }

    else if (
      lead.follow_up_priority === "Medium"
    ) {
      score += 8;

      reasons.push(
        "Marked as medium priority"
      );
    }

    else if (
      lead.follow_up_priority === "Low"
    ) {
      score += 3;
    }

    // =====================
    // FOLLOW-UP ACTIVITY
    // =====================

    const leadFollowUps =
      followUps.filter(
        (followUp) =>
          followUp.lead_id === lead.id
      );

    const pendingFollowUps =
      leadFollowUps.filter(
        (followUp) =>
          !followUp.completed
      );

    if (pendingFollowUps.length > 0) {
      score += 10;

      reasons.push(
        `${pendingFollowUps.length} pending follow-up`
      );
    }

    const overdueFollowUps =
      pendingFollowUps.filter(
        (followUp) =>
          isOverdue(followUp.due_date)
      );

    if (overdueFollowUps.length > 0) {
      score += 10;

      reasons.push(
        "Has overdue follow-up requiring attention"
      );
    }

    // =====================
    // FOLLOW-UP NOTES
    // =====================

    if (
      lead.follow_up_notes &&
      lead.follow_up_notes.trim().length > 10
    ) {
      score += 5;

      reasons.push(
        "Lead has detailed follow-up notes"
      );
    }

    // =====================
    // LIMIT SCORE
    // =====================

    if (score > 100) {
      score = 100;
    }

    // =====================
    // CATEGORY
    // =====================

    let category:
      | "Hot"
      | "Warm"
      | "Cold";

    let action = "";

    if (score >= 75) {
      category = "Hot";

      action =
        "Contact immediately and focus on moving this lead toward conversion.";
    }

    else if (score >= 50) {
      category = "Warm";

      action =
        "Follow up soon and understand the lead's requirements and objections.";
    }

    else {
      category = "Cold";

      action =
        "Nurture this lead and gather more information before prioritizing.";
    }

    return {
      ...lead,

      score,

      category,

      reason: reasons,

      action,
    };
  }

  // =========================
  // SCORE ALL LEADS
  // =========================

  const scoredLeads = useMemo(() => {
    return leads
      .map((lead) => scoreLead(lead))
      .sort(
        (a, b) =>
          b.score - a.score
      );
  }, [leads, followUps]);

  // =========================
  // SUMMARY
  // =========================

  const hotLeads =
    scoredLeads.filter(
      (lead) =>
        lead.category === "Hot"
    );

  const warmLeads =
    scoredLeads.filter(
      (lead) =>
        lead.category === "Warm"
    );

  const coldLeads =
    scoredLeads.filter(
      (lead) =>
        lead.category === "Cold"
    );

  // =========================
  // CATEGORY STYLE
  // =========================

  function getCategoryStyle(
    category: string
  ) {
    switch (category) {
      case "Hot":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/40",
          badge:
            "bg-red-500/20 text-red-400",
          icon: "🔥",
          text: "HOT LEAD",
        };

      case "Warm":
        return {
          bg: "bg-yellow-500/10",
          border: "border-yellow-500/40",
          badge:
            "bg-yellow-500/20 text-yellow-400",
          icon: "🟡",
          text: "WARM LEAD",
        };

      default:
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/40",
          badge:
            "bg-blue-500/20 text-blue-400",
          icon: "❄️",
          text: "COLD LEAD",
        };
    }
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-4">
            🤖
          </div>

          <h2 className="text-xl font-semibold">
            BizAI is scoring your leads...
          </h2>

          <p className="text-slate-400 mt-2">
            Analyzing your best business opportunities.
          </p>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>

            <h1 className="text-3xl md:text-4xl font-bold">
              🎯 AI Lead Scoring
            </h1>

            <p className="text-slate-400 mt-2">
              BizAI automatically finds your best leads to focus on.
            </p>

          </div>

          <button
            onClick={() =>
              loadData(true)
            }
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-3 rounded-xl font-semibold"
          >

            {refreshing
              ? "🤖 Scoring..."
              : "🔄 Refresh Scores"}

          </button>

        </div>


        {/* AI INSIGHT */}

        <div className="bg-gradient-to-r from-red-600/20 via-orange-500/10 to-slate-900 border border-orange-500/30 rounded-2xl p-6 mb-8">

          <p className="text-orange-400 text-sm font-semibold mb-2">
            🤖 BIZAI LEAD INSIGHT
          </p>

          <h2 className="text-2xl font-bold">

            {hotLeads.length > 0
              ? `You have ${hotLeads.length} hot lead${hotLeads.length !== 1 ? "s" : ""} ready for priority attention.`
              : "No hot leads yet. Focus on warming up your best opportunities."}

          </h2>

          <p className="text-slate-300 mt-3">

            {scoredLeads.length > 0
              ? `Your highest scoring lead is ${scoredLeads[0].name} with a score of ${scoredLeads[0].score}/100.`
              : "Add leads to your business to start AI lead scoring."}

          </p>

        </div>


        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              🎯 Total Leads
            </p>

            <p className="text-3xl font-bold mt-2">
              {scoredLeads.length}
            </p>

          </div>


          <div className="bg-slate-900 border border-red-500/30 rounded-xl p-5">

            <p className="text-red-400 text-sm">
              🔥 Hot Leads
            </p>

            <p className="text-3xl font-bold mt-2">
              {hotLeads.length}
            </p>

          </div>


          <div className="bg-slate-900 border border-yellow-500/30 rounded-xl p-5">

            <p className="text-yellow-400 text-sm">
              🟡 Warm Leads
            </p>

            <p className="text-3xl font-bold mt-2">
              {warmLeads.length}
            </p>

          </div>


          <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">

            <p className="text-blue-400 text-sm">
              ❄️ Cold Leads
            </p>

            <p className="text-3xl font-bold mt-2">
              {coldLeads.length}
            </p>

          </div>

        </div>


        {/* TOP LEADS */}

        {scoredLeads.length > 0 && (

          <div className="mb-10">

            <h2 className="text-2xl font-bold mb-5">
              🔥 Top Leads to Focus On
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {scoredLeads
                .slice(0, 3)
                .map(
                  (
                    lead,
                    index
                  ) => {
                    const style =
                      getCategoryStyle(
                        lead.category
                      );

                    return (
                      <div
                        key={lead.id}
                        className={`border ${style.border} ${style.bg} rounded-2xl p-6`}
                      >

                        <p className="text-slate-400 text-sm">
                          Rank #{index + 1}
                        </p>

                        <div className="flex items-center justify-between mt-4">

                          <div className="text-4xl">
                            {style.icon}
                          </div>

                          <span
                            className={`${style.badge} px-3 py-1 rounded-full text-xs font-semibold`}
                          >
                            {style.text}
                          </span>

                        </div>

                        <h3 className="text-xl font-bold mt-5">
                          {lead.name}
                        </h3>

                        <p className="text-slate-400 text-sm mt-1">
                          Status: {lead.status}
                        </p>

                        <div className="mt-5">

                          <p className="text-slate-400 text-sm">
                            AI Score
                          </p>

                          <p className="text-4xl font-bold mt-1">

                            {lead.score}

                            <span className="text-lg text-slate-400">
                              /100
                            </span>

                          </p>

                        </div>

                      </div>
                    );
                  }
                )}

            </div>

          </div>

        )}


        {/* ALL LEADS */}

        <div>

          <div className="mb-5">

            <h2 className="text-2xl font-bold">
              📊 All Lead Scores
            </h2>

            <p className="text-slate-400 text-sm mt-1">
              Leads are automatically ranked from highest to lowest opportunity.
            </p>

          </div>


          {scoredLeads.length === 0 ? (

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">

              <div className="text-5xl mb-4">
                🎯
              </div>

              <h3 className="text-xl font-bold">
                No leads available
              </h3>

              <p className="text-slate-400 mt-2">
                Add your first lead to start using AI Lead Scoring.
              </p>

            </div>

          ) : (

            <div className="space-y-5">

              {scoredLeads.map(
                (lead, index) => {
                  const style =
                    getCategoryStyle(
                      lead.category
                    );

                  return (
                    <div
                      key={lead.id}
                      className={`bg-slate-900 border ${style.border} rounded-2xl p-6`}
                    >

                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

                        {/* LEAD INFO */}

                        <div className="flex items-start gap-4">

                          <div className="text-4xl">

                            {style.icon}

                          </div>

                          <div>

                            <div className="flex flex-wrap items-center gap-3">

                              <h3 className="text-xl font-bold">

                                #{index + 1}{" "}

                                {lead.name}

                              </h3>

                              <span
                                className={`${style.badge} px-3 py-1 rounded-full text-xs font-semibold`}
                              >

                                {style.text}

                              </span>

                            </div>

                            <p className="text-slate-400 text-sm mt-2">

                              Current Status:{" "}

                              {lead.status}

                            </p>

                          </div>

                        </div>


                        {/* SCORE */}

                        <div className="lg:text-right">

                          <p className="text-slate-400 text-sm">

                            AI LEAD SCORE

                          </p>

                          <p className="text-4xl font-bold mt-1">

                            {lead.score}

                            <span className="text-lg text-slate-400">

                              /100

                            </span>

                          </p>

                        </div>

                      </div>


                      {/* SCORE BAR */}

                      <div className="mt-6">

                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">

                          <div
                            className="h-full bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500"
                            style={{
                              width: `${lead.score}%`,
                            }}
                          />

                        </div>

                      </div>


                      {/* REASONS */}

                      <div className="mt-6">

                        <h4 className="font-semibold mb-3">

                          🤖 Why BizAI gave this score

                        </h4>

                        <div className="flex flex-wrap gap-2">

                          {lead.reason.map(
                            (
                              reason,
                              reasonIndex
                            ) => (

                              <span
                                key={
                                  reasonIndex
                                }
                                className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm text-slate-300"
                              >

                                {reason}

                              </span>

                            )
                          )}

                        </div>

                      </div>


                      {/* RECOMMENDED ACTION */}

                      <div className="mt-6 bg-slate-800/70 border border-slate-700 rounded-xl p-4">

                        <p className="text-blue-400 text-sm font-semibold">

                          🎯 RECOMMENDED ACTION

                        </p>

                        <p className="text-slate-300 mt-2">

                          {lead.action}

                        </p>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </div>


        {/* HOW IT WORKS */}

        <div className="mt-10 bg-slate-900 border border-slate-800 rounded-2xl p-6">

          <h2 className="text-xl font-bold mb-5">

            🤖 How AI Lead Scoring Works

          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

            <div>

              <div className="text-3xl mb-3">
                📊
              </div>

              <h3 className="font-semibold">
                Lead Status
              </h3>

              <p className="text-slate-400 text-sm mt-2">
                Interested and negotiation leads receive higher scores.
              </p>

            </div>


            <div>

              <div className="text-3xl mb-3">
                ⭐
              </div>

              <h3 className="font-semibold">
                Priority
              </h3>

              <p className="text-slate-400 text-sm mt-2">
                High-priority leads receive additional points.
              </p>

            </div>


            <div>

              <div className="text-3xl mb-3">
                📞
              </div>

              <h3 className="font-semibold">
                Follow-ups
              </h3>

              <p className="text-slate-400 text-sm mt-2">
                Active and overdue follow-ups increase urgency.
              </p>

            </div>


            <div>

              <div className="text-3xl mb-3">
                🎯
              </div>

              <h3 className="font-semibold">
                Opportunity
              </h3>

              <p className="text-slate-400 text-sm mt-2">
                BizAI combines all signals into a score out of 100.
              </p>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}