"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Lead = {
  id: string;
  name: string;
  status: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
};

export default function LeadInsightsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  // =========================
  // LOAD LEADS
  // =========================

  async function loadLeads(isRefresh = false) {
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

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Lead error:", error.message);
      setLeads([]);
    } else {
      setLeads(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }

  // =========================
  // CALCULATE LEAD SCORE
  // =========================

  function getLeadScore(lead: Lead) {
    let score = 0;

    // Status Score

    if (lead.status === "Negotiation") {
      score += 90;
    } else if (lead.status === "Interested") {
      score += 75;
    } else if (lead.status === "Contacted") {
      score += 50;
    } else if (lead.status === "New") {
      score += 35;
    } else if (lead.status === "Converted") {
      score += 100;
    }

    // Contact Information Bonus

    if (lead.email) {
      score += 5;
    }

    if (lead.phone) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  // =========================
  // LEAD PRIORITY
  // =========================

  function getLeadPriority(score: number) {
    if (score >= 80) {
      return {
        label: "Hot Lead",
        emoji: "🔥",
        color: "text-red-400",
        border: "border-red-500/30",
        bg: "bg-red-500/10",
      };
    }

    if (score >= 60) {
      return {
        label: "High Potential",
        emoji: "🟢",
        color: "text-green-400",
        border: "border-green-500/30",
        bg: "bg-green-500/10",
      };
    }

    if (score >= 40) {
      return {
        label: "Medium Priority",
        emoji: "🟡",
        color: "text-yellow-400",
        border: "border-yellow-500/30",
        bg: "bg-yellow-500/10",
      };
    }

    return {
      label: "Needs Attention",
      emoji: "🔵",
      color: "text-blue-400",
      border: "border-blue-500/30",
      bg: "bg-blue-500/10",
    };
  }

  // =========================
  // LEAD ANALYSIS
  // =========================

  const analyzedLeads = useMemo(() => {
    return leads
      .map((lead) => {
        const score = getLeadScore(lead);
        const priority = getLeadPriority(score);

        return {
          ...lead,
          score,
          priority,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [leads]);

  // =========================
  // SUMMARY
  // =========================

  const summary = useMemo(() => {
    const hotLeads = analyzedLeads.filter(
      (lead) => lead.score >= 80
    ).length;

    const highPotential = analyzedLeads.filter(
      (lead) =>
        lead.score >= 60 &&
        lead.score < 80
    ).length;

    const mediumPriority = analyzedLeads.filter(
      (lead) =>
        lead.score >= 40 &&
        lead.score < 60
    ).length;

    const needsAttention = analyzedLeads.filter(
      (lead) => lead.score < 40
    ).length;

    const averageScore =
      analyzedLeads.length > 0
        ? Math.round(
            analyzedLeads.reduce(
              (total, lead) =>
                total + lead.score,
              0
            ) / analyzedLeads.length
          )
        : 0;

    return {
      hotLeads,
      highPotential,
      mediumPriority,
      needsAttention,
      averageScore,
    };
  }, [analyzedLeads]);

  // =========================
  // AI RECOMMENDATION
  // =========================

  function getRecommendation(lead: {
    status: string;
    score: number;
  }) {
    if (lead.status === "Negotiation") {
      return "Close this deal quickly. This lead has a high chance of conversion.";
    }

    if (lead.status === "Interested") {
      return "Follow up soon and provide more information about your product or service.";
    }

    if (lead.status === "Contacted") {
      return "Continue communication and understand the customer's requirements.";
    }

    if (lead.status === "New") {
      return "Contact this lead quickly and start building a relationship.";
    }

    if (lead.status === "Converted") {
      return "Great! This lead is already converted. Focus on customer satisfaction.";
    }

    return "Monitor this lead and update its progress.";
  }

  // =========================
  // LOADING SCREEN
  // =========================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-4">
            🤖
          </div>

          <h2 className="text-xl font-semibold">
            AI is analyzing your leads...
          </h2>

          <p className="text-slate-400 mt-2">
            Generating smart lead insights.
          </p>

        </div>

      </main>
    );
  }

  // =========================
  // PAGE
  // =========================

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>

            <h1 className="text-3xl md:text-4xl font-bold">
              🤖 AI Lead Insights
            </h1>

            <p className="text-slate-400 mt-2">
              Smart lead analysis and conversion
              recommendations powered by BizAI.
            </p>

          </div>

          <button
            onClick={() => loadLeads(true)}
            disabled={refreshing}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-5 py-3 rounded-xl font-semibold"
          >
            {refreshing
              ? "🔄 Analyzing..."
              : "🤖 Refresh AI Insights"}
          </button>

        </div>


        {/* AI SUMMARY */}

        <div className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-slate-900 border border-purple-500/30 rounded-2xl p-6 md:p-8 mb-8">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            <div>

              <p className="text-purple-400 text-sm font-semibold">
                🤖 BIZAI LEAD INTELLIGENCE
              </p>

              <h2 className="text-4xl font-bold mt-3">
                {summary.averageScore}
                <span className="text-xl text-slate-400">
                  /100
                </span>
              </h2>

              <p className="text-slate-300 mt-3">
                Average lead opportunity score
                based on your current pipeline.
              </p>

            </div>


            <div className="bg-slate-950/60 border border-slate-700 rounded-xl p-5">

              <p className="text-slate-400 text-sm">
                AI Quick Insight
              </p>

              <p className="text-lg font-semibold mt-3">

                {summary.hotLeads > 0
                  ? `🔥 You have ${summary.hotLeads} hot lead(s) ready for immediate attention.`
                  : summary.highPotential > 0
                  ? `🟢 You have ${summary.highPotential} high-potential lead(s).`
                  : "📞 Focus on contacting and nurturing your leads."}

              </p>

            </div>

          </div>

        </div>


        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

          <div className="bg-slate-900 border border-red-500/30 rounded-xl p-5">

            <p className="text-red-400">
              🔥 Hot Leads
            </p>

            <p className="text-3xl font-bold mt-3">
              {summary.hotLeads}
            </p>

            <p className="text-slate-400 text-sm mt-2">
              Immediate action recommended
            </p>

          </div>


          <div className="bg-slate-900 border border-green-500/30 rounded-xl p-5">

            <p className="text-green-400">
              🟢 High Potential
            </p>

            <p className="text-3xl font-bold mt-3">
              {summary.highPotential}
            </p>

            <p className="text-slate-400 text-sm mt-2">
              Strong conversion opportunity
            </p>

          </div>


          <div className="bg-slate-900 border border-yellow-500/30 rounded-xl p-5">

            <p className="text-yellow-400">
              🟡 Medium Priority
            </p>

            <p className="text-3xl font-bold mt-3">
              {summary.mediumPriority}
            </p>

            <p className="text-slate-400 text-sm mt-2">
              Continue communication
            </p>

          </div>


          <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">

            <p className="text-blue-400">
              🔵 New Leads
            </p>

            <p className="text-3xl font-bold mt-3">
              {summary.needsAttention}
            </p>

            <p className="text-slate-400 text-sm mt-2">
              Initial contact needed
            </p>

          </div>

        </div>


        {/* AI RECOMMENDATIONS */}

        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 mb-8">

          <h2 className="text-xl font-bold">
            🤖 AI Smart Recommendations
          </h2>

          <p className="text-slate-400 text-sm mt-1 mb-6">
            Recommendations based on your real lead data
          </p>


          <div className="space-y-4">

            {summary.hotLeads > 0 && (

              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">

                🔥 <span className="font-bold">
                  Priority:
                </span>{" "}

                Contact your hot leads immediately.
                They are already in advanced stages
                of your sales pipeline.

              </div>

            )}


            {summary.highPotential > 0 && (

              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">

                🟢 <span className="font-bold">
                  Opportunity:
                </span>{" "}

                Focus on interested leads. A proper
                follow-up can move them toward
                negotiation and conversion.

              </div>

            )}


            {summary.mediumPriority > 0 && (

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">

                🟡 <span className="font-bold">
                  Nurture:
                </span>{" "}

                Continue communicating with contacted
                leads and understand their business
                requirements.

              </div>

            )}


            {summary.needsAttention > 0 && (

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">

                🔵 <span className="font-bold">
                  Action Required:
                </span>{" "}

                Contact new leads quickly. Fast
                response can improve engagement
                and conversion chances.

              </div>

            )}


            {leads.length === 0 && (

              <div className="bg-slate-950 border border-slate-700 rounded-xl p-5 text-slate-300">

                📭 No leads found yet. Add leads to
                your BizAI system and AI will start
                analyzing them.

              </div>

            )}

          </div>

        </div>


        {/* LEAD LIST */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

          <div className="mb-6">

            <h2 className="text-xl font-bold">
              🎯 AI Lead Ranking
            </h2>

            <p className="text-slate-400 text-sm mt-1">
              Leads ranked automatically by
              conversion opportunity
            </p>

          </div>


          <div className="space-y-4">

            {analyzedLeads.map((lead) => (

              <div
                key={lead.id}
                className={`border ${lead.priority.border} ${lead.priority.bg} rounded-xl p-5`}
              >

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                  {/* LEAD INFO */}

                  <div>

                    <h3 className="text-lg font-bold">

                      {lead.priority.emoji}{" "}

                      {lead.name}

                    </h3>

                    <div className="flex flex-wrap gap-3 mt-3 text-sm">

                      <span className="bg-slate-950 px-3 py-1 rounded-lg text-slate-300">

                        Status:{" "}

                        <span className="font-semibold">

                          {lead.status}

                        </span>

                      </span>


                      {lead.email && (

                        <span className="bg-slate-950 px-3 py-1 rounded-lg text-slate-300">

                          📧 {lead.email}

                        </span>

                      )}


                      {lead.phone && (

                        <span className="bg-slate-950 px-3 py-1 rounded-lg text-slate-300">

                          📞 {lead.phone}

                        </span>

                      )}

                    </div>


                    {/* AI RECOMMENDATION */}

                    <p className="text-slate-300 text-sm mt-4 max-w-2xl">

                      🤖{" "}

                      {getRecommendation(lead)}

                    </p>

                  </div>


                  {/* SCORE */}

                  <div className="min-w-[150px] bg-slate-950/70 rounded-xl p-4 text-center">

                    <p className="text-slate-400 text-sm">
                      AI Score
                    </p>

                    <p className={`text-3xl font-bold mt-2 ${lead.priority.color}`}>

                      {lead.score}

                    </p>

                    <p className="text-xs text-slate-400 mt-2">

                      {lead.priority.label}

                    </p>

                  </div>

                </div>

              </div>

            ))}


            {analyzedLeads.length === 0 && (

              <div className="text-center py-10 text-slate-400">

                No leads available for analysis.

              </div>

            )}

          </div>

        </div>


        {/* FOOTER */}

        <div className="text-center text-slate-500 text-sm mt-10 pb-5">

          🤖 BizAI Lead Intelligence • Smart
          insights powered by your business data

        </div>

      </div>

    </main>
  );
}