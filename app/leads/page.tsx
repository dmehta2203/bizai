"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import FeatureGuard from "@/components/FeatureGuard";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Lead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  business_name: string | null;
  status: string;
  created_at?: string;
};

type Activity = {
  id: string;
  lead_id: string;
  activity_type: string;
  activity_message: string;
  created_at: string;
};

type FollowUp = {
  id: string;
  user_id: string;
  lead_id: string;
  title: string;
  due_date: string;
  completed: boolean;
  created_at: string;
};

const PIPELINE_STAGES = [
  {
    name: "New",
    icon: "🆕",
    description: "Fresh leads",
  },
  {
    name: "Contacted",
    icon: "📞",
    description: "Contact made",
  },
  {
    name: "Interested",
    icon: "🔥",
    description: "Interested leads",
  },
  {
    name: "Negotiation",
    icon: "🤝",
    description: "Closing the deal",
  },
  {
    name: "Converted",
    icon: "✅",
    description: "Successful customers",
  },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  const [userId, setUserId] =
    useState<string | null>(null);

  // =========================
  // ADD LEAD
  // =========================

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [businessName, setBusinessName] =
    useState("");

  const [status, setStatus] =
    useState("New");

  const [loading, setLoading] =
    useState(false);

  // =========================
  // SEARCH FILTER SORT
  // =========================

  const [search, setSearch] =
    useState("");

  const [filterStatus, setFilterStatus] =
    useState("All");

  const [sortOrder, setSortOrder] =
    useState<"newest" | "oldest">(
      "newest"
    );

  // =========================
  // EDIT LEAD
  // =========================

  const [editingLead, setEditingLead] =
    useState<Lead | null>(null);

  const [editName, setEditName] =
    useState("");

  const [editPhone, setEditPhone] =
    useState("");

  const [editEmail, setEditEmail] =
    useState("");

  const [
    editBusinessName,
    setEditBusinessName,
  ] = useState("");

  const [editStatus, setEditStatus] =
    useState("New");

  const [editLoading, setEditLoading] =
    useState(false);

  // =========================
  // ACTIVITY TIMELINE
  // =========================

  const [selectedLead, setSelectedLead] =
    useState<Lead | null>(null);

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [allActivities, setAllActivities] =
    useState<Activity[]>([]);

  const [activityType, setActivityType] =
    useState("Note");

  const [
    activityMessage,
    setActivityMessage,
  ] = useState("");

  const [
    activityLoading,
    setActivityLoading,
  ] = useState(false);

  // =========================
  // FOLLOW UPS
  // =========================

  const [followUps, setFollowUps] =
    useState<FollowUp[]>([]);

  const [
    followUpTitle,
    setFollowUpTitle,
  ] = useState("");

  const [
    followUpDate,
    setFollowUpDate,
  ] = useState("");

  const [
    followUpLoading,
    setFollowUpLoading,
  ] = useState(false);

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    loadUserAndLeads();
  }, []);

  // =========================
  // LOAD USER AND DATA
  // =========================

  async function loadUserAndLeads() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const id = session.user.id;

      setUserId(id);

      await Promise.all([
        fetchLeads(id),
        fetchFollowUps(id),
        fetchAllActivities(id),
      ]);
    } else {
      window.location.href = "/login";
    }
  }

  // =========================
  // FETCH LEADS
  // =========================

  async function fetchLeads(
    currentUserId?: string
  ) {
    const id =
      currentUserId || userId;

    if (!id) return;

    const { data, error } =
      await supabase
        .from("leads")
        .select("*")
        .eq("user_id", id)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Error fetching leads:",
        error.message
      );
    } else {
      setLeads(data || []);
    }
  }

  // =========================
  // FETCH ALL ACTIVITIES
  // =========================

  async function fetchAllActivities(
    currentUserId?: string
  ) {
    const id =
      currentUserId || userId;

    if (!id) return;

    const { data, error } =
      await supabase
        .from("lead_activities")
        .select("*")
        .eq("user_id", id)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Error fetching activities:",
        error.message
      );
    } else {
      setAllActivities(data || []);
    }
  }

  // =========================
  // FETCH FOLLOW UPS
  // =========================

  async function fetchFollowUps(
    currentUserId?: string
  ) {
    const id =
      currentUserId || userId;

    if (!id) return;

    const { data, error } =
      await supabase
        .from("follow_ups")
        .select("*")
        .eq("user_id", id)
        .order("due_date", {
          ascending: true,
        });

    if (error) {
      console.error(
        "Error fetching follow ups:",
        error.message
      );
    } else {
      setFollowUps(data || []);
    }
  }

  // =========================
  // ADD LEAD
  // =========================

  async function addLead(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Lead name is required");
      return;
    }

    if (!userId) {
      alert("Please login first");
      return;
    }

    setLoading(true);

    const { data, error } =
      await supabase
        .from("leads")
        .insert([
          {
            user_id: userId,
            name: name.trim(),
            phone:
              phone.trim() || null,
            email:
              email.trim() || null,
            business_name:
              businessName.trim() || null,
            status,
          },
        ])
        .select()
        .single();

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      await supabase
        .from("lead_activities")
        .insert([
          {
            user_id: userId,
            lead_id: data.id,
            activity_type: "Lead Added",
            activity_message:
              "Lead was added to BizAI.",
          },
        ]);

      alert(
        "Lead added successfully! 🎉"
      );

      setName("");
      setPhone("");
      setEmail("");
      setBusinessName("");
      setStatus("New");

      await Promise.all([
        fetchLeads(),
        fetchAllActivities(),
      ]);
    }

    setLoading(false);
  }

  // =========================
  // UPDATE LEAD STATUS
  // =========================

  async function updateLeadStatus(
    id: string,
    newStatus: string
  ) {
    if (!userId) return;

    const lead = leads.find(
      (item) => item.id === id
    );

    const oldStatus =
      lead?.status;

    const { error } =
      await supabase
        .from("leads")
        .update({
          status: newStatus,
        })
        .eq("id", id)
        .eq("user_id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    if (oldStatus !== newStatus) {
      await supabase
        .from("lead_activities")
        .insert([
          {
            user_id: userId,
            lead_id: id,
            activity_type:
              "Status Updated",
            activity_message:
              `Lead status changed from ${oldStatus} to ${newStatus}.`,
          },
        ]);
    }

    await Promise.all([
      fetchLeads(),
      fetchAllActivities(),
    ]);

    if (selectedLead?.id === id) {
      await fetchActivities(id);

      setSelectedLead({
        ...selectedLead,
        status: newStatus,
      });
    }
  }

  // =========================
  // DELETE LEAD
  // =========================

  async function deleteLead(
    id: string
  ) {
    const confirmed = confirm(
      "Are you sure you want to delete this lead?"
    );

    if (!confirmed || !userId) return;

    const { error } =
      await supabase
        .from("leads")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

    if (error) {
      alert(error.message);
    } else {
      if (
        selectedLead?.id === id
      ) {
        setSelectedLead(null);
        setActivities([]);
      }

      await Promise.all([
        fetchLeads(),
        fetchFollowUps(),
        fetchAllActivities(),
      ]);
    }
  }

  // =========================
  // OPEN EDIT LEAD
  // =========================

  function openEditLead(
    lead: Lead
  ) {
    setEditingLead(lead);

    setEditName(lead.name || "");
    setEditPhone(lead.phone || "");
    setEditEmail(lead.email || "");

    setEditBusinessName(
      lead.business_name || ""
    );

    setEditStatus(
      lead.status || "New"
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =========================
  // UPDATE LEAD
  // =========================

  async function updateLead(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!editingLead || !userId)
      return;

    if (!editName.trim()) {
      alert("Lead name is required");
      return;
    }

    setEditLoading(true);

    const oldStatus =
      editingLead.status;

    const { error } =
      await supabase
        .from("leads")
        .update({
          name: editName.trim(),
          phone:
            editPhone.trim() || null,
          email:
            editEmail.trim() || null,
          business_name:
            editBusinessName.trim() ||
            null,
          status: editStatus,
        })
        .eq("id", editingLead.id)
        .eq("user_id", userId);

    if (error) {
      alert(error.message);
      setEditLoading(false);
      return;
    }

    await supabase
      .from("lead_activities")
      .insert([
        {
          user_id: userId,
          lead_id: editingLead.id,
          activity_type: "Lead Updated",
          activity_message:
            "Lead information was updated.",
        },
      ]);

    if (oldStatus !== editStatus) {
      await supabase
        .from("lead_activities")
        .insert([
          {
            user_id: userId,
            lead_id:
              editingLead.id,
            activity_type:
              "Status Updated",
            activity_message:
              `Lead status changed from ${oldStatus} to ${editStatus}.`,
          },
        ]);
    }

    alert(
      "Lead updated successfully! 🎉"
    );

    const updatedLead: Lead = {
      ...editingLead,
      name: editName.trim(),
      phone:
        editPhone.trim() || null,
      email:
        editEmail.trim() || null,
      business_name:
        editBusinessName.trim() || null,
      status: editStatus,
    };

    if (
      selectedLead?.id ===
      editingLead.id
    ) {
      setSelectedLead(updatedLead);

      await fetchActivities(
        editingLead.id
      );
    }

    setEditingLead(null);

    setEditName("");
    setEditPhone("");
    setEditEmail("");
    setEditBusinessName("");
    setEditStatus("New");

    await Promise.all([
      fetchLeads(),
      fetchAllActivities(),
    ]);

    setEditLoading(false);
  }

  // =========================
  // CANCEL EDIT
  // =========================

  function cancelEdit() {
    setEditingLead(null);

    setEditName("");
    setEditPhone("");
    setEditEmail("");
    setEditBusinessName("");
    setEditStatus("New");
  }

  // =========================
  // OPEN TIMELINE
  // =========================

  async function openLeadTimeline(
    lead: Lead
  ) {
    setSelectedLead(lead);

    setActivityMessage("");
    setActivityType("Note");

    setFollowUpTitle("");
    setFollowUpDate("");

    await fetchActivities(
      lead.id
    );

    setTimeout(() => {
      document
        .getElementById(
          "lead-timeline"
        )
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }, 100);
  }

  // =========================
  // FETCH ACTIVITIES
  // =========================

  async function fetchActivities(
    leadId: string
  ) {
    const { data, error } =
      await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", leadId)
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

  // =========================
  // ADD ACTIVITY
  // =========================

  async function addActivity(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!selectedLead || !userId)
      return;

    if (!activityMessage.trim()) {
      alert(
        "Please enter an activity or note"
      );
      return;
    }

    setActivityLoading(true);

    const { error } =
      await supabase
        .from("lead_activities")
        .insert([
          {
            user_id: userId,
            lead_id:
              selectedLead.id,
            activity_type:
              activityType,
            activity_message:
              activityMessage.trim(),
          },
        ]);

    if (error) {
      alert(error.message);
    } else {
      setActivityMessage("");

      await Promise.all([
        fetchActivities(
          selectedLead.id
        ),
        fetchAllActivities(),
      ]);
    }

    setActivityLoading(false);
  }

  // =========================
  // DELETE ACTIVITY
  // =========================

  async function deleteActivity(
    activityId: string
  ) {
    const confirmed = confirm(
      "Delete this activity?"
    );

    if (!confirmed || !userId)
      return;

    const { error } =
      await supabase
        .from("lead_activities")
        .delete()
        .eq("id", activityId)
        .eq("user_id", userId);

    if (error) {
      alert(error.message);
    } else if (selectedLead) {
      await Promise.all([
        fetchActivities(
          selectedLead.id
        ),
        fetchAllActivities(),
      ]);
    }
  }

  // =========================
  // ADD FOLLOW UP
  // =========================

  async function addFollowUp(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!selectedLead || !userId) {
      alert(
        "Please select a lead first"
      );
      return;
    }

    if (!followUpTitle.trim()) {
      alert(
        "Please enter a follow-up title"
      );
      return;
    }

    if (!followUpDate) {
      alert(
        "Please select a date and time"
      );
      return;
    }

    setFollowUpLoading(true);

    const { error } =
      await supabase
        .from("follow_ups")
        .insert([
          {
            user_id: userId,
            lead_id:
              selectedLead.id,
            title:
              followUpTitle.trim(),
            due_date: new Date(
              followUpDate
            ).toISOString(),
            completed: false,
          },
        ]);

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      await supabase
        .from("lead_activities")
        .insert([
          {
            user_id: userId,
            lead_id:
              selectedLead.id,
            activity_type:
              "Follow-up",
            activity_message:
              `Follow-up scheduled: ${followUpTitle.trim()}`,
          },
        ]);

      setFollowUpTitle("");
      setFollowUpDate("");

      await Promise.all([
        fetchFollowUps(),
        fetchActivities(
          selectedLead.id
        ),
        fetchAllActivities(),
      ]);

      alert(
        "Follow-up scheduled! 📅"
      );
    }

    setFollowUpLoading(false);
  }

  // =========================
  // COMPLETE FOLLOW UP
  // =========================

  async function completeFollowUp(
    followUp: FollowUp
  ) {
    if (!userId) return;

    const { error } =
      await supabase
        .from("follow_ups")
        .update({
          completed: true,
        })
        .eq("id", followUp.id)
        .eq("user_id", userId);

    if (error) {
      alert(error.message);
    } else {
      await supabase
        .from("lead_activities")
        .insert([
          {
            user_id: userId,
            lead_id:
              followUp.lead_id,
            activity_type:
              "Follow-up Completed",
            activity_message:
              `Completed follow-up: ${followUp.title}`,
          },
        ]);

      await Promise.all([
        fetchFollowUps(),
        fetchAllActivities(),
      ]);

      if (
        selectedLead?.id ===
        followUp.lead_id
      ) {
        await fetchActivities(
          followUp.lead_id
        );
      }
    }
  }

  // =========================
  // DELETE FOLLOW UP
  // =========================

  async function deleteFollowUp(
    followUpId: string
  ) {
    const confirmed = confirm(
      "Delete this follow-up?"
    );

    if (!confirmed || !userId)
      return;

    const { error } =
      await supabase
        .from("follow_ups")
        .delete()
        .eq("id", followUpId)
        .eq("user_id", userId);

    if (error) {
      alert(error.message);
    } else {
      await fetchFollowUps();
    }
  }

  // =========================
  // GET LEAD NAME
  // =========================

  function getLeadName(
    leadId: string
  ) {
    const lead = leads.find(
      (item) =>
        item.id === leadId
    );

    return (
      lead?.name || "Unknown Lead"
    );
  }

  // =========================
  // FOLLOW UP CATEGORY
  // =========================

  function getFollowUpCategory(
    followUp: FollowUp
  ) {
    if (followUp.completed) {
      return "completed";
    }

    const dueDate = new Date(
      followUp.due_date
    );

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const tomorrow = new Date(today);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    if (dueDate < today) {
      return "overdue";
    }

    if (
      dueDate >= today &&
      dueDate < tomorrow
    ) {
      return "today";
    }

    return "upcoming";
  }

  // =========================
  // FOLLOW UP GROUPS
  // =========================

  const overdueFollowUps =
    followUps.filter(
      (followUp) =>
        getFollowUpCategory(
          followUp
        ) === "overdue"
    );

  const todayFollowUps =
    followUps.filter(
      (followUp) =>
        getFollowUpCategory(
          followUp
        ) === "today"
    );

  const upcomingFollowUps =
    followUps.filter(
      (followUp) =>
        getFollowUpCategory(
          followUp
        ) === "upcoming"
    );

  const completedFollowUps =
    followUps.filter(
      (followUp) =>
        followUp.completed
    );

  // =========================
  // AI LEAD SCORE
  // =========================

  function getLeadScore(
    lead: Lead
  ) {
    let score = 0;

    switch (lead.status) {
      case "New":
        score += 30;
        break;

      case "Contacted":
        score += 50;
        break;

      case "Interested":
        score += 80;
        break;

      case "Negotiation":
        score += 90;
        break;

      case "Converted":
        score += 100;
        break;

      default:
        score += 20;
    }

    const leadFollowUps =
      followUps.filter(
        (followUp) =>
          followUp.lead_id ===
          lead.id
      );

    const pendingFollowUps =
      leadFollowUps.filter(
        (followUp) =>
          !followUp.completed
      );

    if (
      pendingFollowUps.length > 0
    ) {
      score += 5;
    }

    const completedCount =
      leadFollowUps.filter(
        (followUp) =>
          followUp.completed
      ).length;

    if (completedCount > 0) {
      score += Math.min(
        completedCount * 2,
        5
      );
    }

    const overdueCount =
      pendingFollowUps.filter(
        (followUp) =>
          getFollowUpCategory(
            followUp
          ) === "overdue"
      ).length;

    score -= overdueCount * 10;

    const leadActivities =
      allActivities.filter(
        (activity) =>
          activity.lead_id ===
          lead.id
      );

    if (
      leadActivities.length > 0
    ) {
      score += Math.min(
        leadActivities.length * 2,
        10
      );
    }

    if (lead.phone) {
      score += 2;
    }

    if (lead.email) {
      score += 2;
    }

    if (lead.business_name) {
      score += 2;
    }

    return Math.max(
      0,
      Math.min(100, score)
    );
  }

  // =========================
  // AI LEAD CATEGORY
  // =========================

  function getLeadCategory(
    score: number
  ) {
    if (score >= 80) {
      return {
        label: "Hot",
        icon: "🔥",
        color:
          "bg-red-500/20 text-red-400 border-red-500/40",
      };
    }

    if (score >= 50) {
      return {
        label: "Warm",
        icon: "🟢",
        color:
          "bg-orange-500/20 text-orange-400 border-orange-500/40",
      };
    }

    return {
      label: "Cold",
      icon: "❄️",
      color:
        "bg-blue-500/20 text-blue-400 border-blue-500/40",
    };
  }

  // =========================
  // SEARCH FILTER SORT
  // =========================

  const filteredLeads =
    useMemo(() => {
      const searchText =
        search.toLowerCase().trim();

      let result = leads.filter(
        (lead) => {
          const matchesSearch =
            !searchText ||
            lead.name
              ?.toLowerCase()
              .includes(searchText) ||
            lead.phone
              ?.toLowerCase()
              .includes(searchText) ||
            lead.email
              ?.toLowerCase()
              .includes(searchText) ||
            lead.business_name
              ?.toLowerCase()
              .includes(searchText);

          const matchesStatus =
            filterStatus === "All" ||
            lead.status ===
              filterStatus;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );

      result.sort((a, b) => {
        const dateA = a.created_at
          ? new Date(
              a.created_at
            ).getTime()
          : 0;

        const dateB = b.created_at
          ? new Date(
              b.created_at
            ).getTime()
          : 0;

        if (
          sortOrder === "newest"
        ) {
          return dateB - dateA;
        }

        return dateA - dateB;
      });

      return result;
    }, [
      leads,
      search,
      filterStatus,
      sortOrder,
    ]);

  // =========================
  // STATUS COLORS
  // =========================

  function getStatusColor(
    status: string
  ) {
    switch (status) {
      case "New":
        return "bg-blue-600";

      case "Contacted":
        return "bg-yellow-600";

      case "Interested":
        return "bg-purple-600";

      case "Negotiation":
        return "bg-orange-600";

      case "Converted":
        return "bg-green-600";

      default:
        return "bg-slate-600";
    }
  }

  function getStageBorderColor(
    stage: string
  ) {
    switch (stage) {
      case "New":
        return "border-blue-500/40";

      case "Contacted":
        return "border-yellow-500/40";

      case "Interested":
        return "border-purple-500/40";

      case "Negotiation":
        return "border-orange-500/40";

      case "Converted":
        return "border-green-500/40";

      default:
        return "border-slate-700";
    }
  }

  function getStageTextColor(
    stage: string
  ) {
    switch (stage) {
      case "New":
        return "text-blue-400";

      case "Contacted":
        return "text-yellow-400";

      case "Interested":
        return "text-purple-400";

      case "Negotiation":
        return "text-orange-400";

      case "Converted":
        return "text-green-400";

      default:
        return "text-slate-400";
    }
  }

  // =========================
  // ACTIVITY ICONS
  // =========================

  function getActivityIcon(
    type: string
  ) {
    switch (type) {
      case "Lead Added":
        return "🎯";

      case "Lead Updated":
        return "✏️";

      case "Status Updated":
        return "🔄";

      case "Call":
        return "📞";

      case "Follow-up":
        return "🔥";

      case "Follow-up Completed":
        return "✅";

      case "WhatsApp":
        return "💬";

      case "Appointment":
        return "📅";

      case "Email":
        return "📧";

      default:
        return "📝";
    }
  }

  // =========================
  // FORMAT DATE
  // =========================

  function formatDate(
    date: string
  ) {
    return new Date(
      date
    ).toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  // =========================
  // GET LEAD COUNT
  // =========================

  function getLeadCount(
    stage: string
  ) {
    return leads.filter(
      (lead) =>
        lead.status === stage
    ).length;
  }

  return (
    <ProtectedLayout>

      <FeatureGuard feature="leads">

        <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">

          <div className="max-w-7xl mx-auto">

            {/* HEADER */}

            <h1 className="text-3xl font-bold mb-2">
              🎯 Lead Management
            </h1>

            <p className="text-slate-400 mb-8">
              Manage leads, sales pipeline and
              follow-up reminders
            </p>

            {/* FOLLOW UP SUMMARY */}

            <div className="mb-10">

              <div className="flex justify-between items-center mb-5">

                <div>

                  <h2 className="text-2xl font-bold">
                    🔔 Follow-up Reminders
                  </h2>

                  <p className="text-slate-400 text-sm mt-1">
                    Never miss an important lead
                    follow-up
                  </p>

                </div>

                <button
                  onClick={() =>
                    fetchFollowUps()
                  }
                  className="text-blue-400 hover:text-blue-300"
                >
                  🔄 Refresh
                </button>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                <div className="bg-slate-900 border border-red-500/40 rounded-xl p-5">

                  <p className="text-slate-400 text-sm">
                    🔴 Overdue
                  </p>

                  <p className="text-3xl font-bold text-red-400 mt-2">
                    {
                      overdueFollowUps.length
                    }
                  </p>

                </div>

                <div className="bg-slate-900 border border-orange-500/40 rounded-xl p-5">

                  <p className="text-slate-400 text-sm">
                    🟠 Today
                  </p>

                  <p className="text-3xl font-bold text-orange-400 mt-2">
                    {
                      todayFollowUps.length
                    }
                  </p>

                </div>

                <div className="bg-slate-900 border border-green-500/40 rounded-xl p-5">

                  <p className="text-slate-400 text-sm">
                    🟢 Upcoming
                  </p>

                  <p className="text-3xl font-bold text-green-400 mt-2">
                    {
                      upcomingFollowUps.length
                    }
                  </p>

                </div>

                <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-5">

                  <p className="text-slate-400 text-sm">
                    ✅ Completed
                  </p>

                  <p className="text-3xl font-bold text-blue-400 mt-2">
                    {
                      completedFollowUps.length
                    }
                  </p>

                </div>

              </div>

            </div>

            {/* OVERDUE FOLLOW UPS */}

            {overdueFollowUps.length >
              0 && (

              <div className="bg-slate-900 border border-red-500/40 rounded-xl p-6 mb-8">

                <h2 className="text-xl font-bold text-red-400 mb-5">
                  🔴 Overdue Follow-ups
                </h2>

                <div className="space-y-3">

                  {overdueFollowUps.map(
                    (followUp) => (

                      <div
                        key={followUp.id}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >

                        <div>

                          <h3 className="font-semibold">
                            👤{" "}
                            {getLeadName(
                              followUp.lead_id
                            )}
                          </h3>

                          <p className="text-slate-300 mt-1">
                            {followUp.title}
                          </p>

                          <p className="text-red-400 text-sm mt-2">
                            Due:{" "}
                            {formatDate(
                              followUp.due_date
                            )}
                          </p>

                        </div>

                        <div className="flex gap-2">

                          <button
                            onClick={() =>
                              completeFollowUp(
                                followUp
                              )
                            }
                            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
                          >
                            ✅ Complete
                          </button>

                          <button
                            onClick={() =>
                              deleteFollowUp(
                                followUp.id
                              )
                            }
                            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
                          >
                            🗑
                          </button>

                        </div>

                      </div>

                    )
                  )}

                </div>

              </div>

            )}

            {/* TODAY FOLLOW UPS */}

            {todayFollowUps.length >
              0 && (

              <div className="bg-slate-900 border border-orange-500/40 rounded-xl p-6 mb-8">

                <h2 className="text-xl font-bold text-orange-400 mb-5">
                  🟠 Today's Follow-ups
                </h2>

                <div className="space-y-3">

                  {todayFollowUps.map(
                    (followUp) => (

                      <div
                        key={followUp.id}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >

                        <div>

                          <h3 className="font-semibold">
                            👤{" "}
                            {getLeadName(
                              followUp.lead_id
                            )}
                          </h3>

                          <p className="text-slate-300 mt-1">
                            {followUp.title}
                          </p>

                          <p className="text-orange-400 text-sm mt-2">
                            Today at{" "}
                            {new Date(
                              followUp.due_date
                            ).toLocaleTimeString(
                              "en-IN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>

                        </div>

                        <div className="flex gap-2">

                          <button
                            onClick={() =>
                              completeFollowUp(
                                followUp
                              )
                            }
                            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
                          >
                            ✅ Complete
                          </button>

                          <button
                            onClick={() =>
                              deleteFollowUp(
                                followUp.id
                              )
                            }
                            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
                          >
                            🗑
                          </button>

                        </div>

                      </div>

                    )
                  )}

                </div>

              </div>

            )}

            {/* UPCOMING FOLLOW UPS */}

            {upcomingFollowUps.length >
              0 && (

              <div className="bg-slate-900 border border-green-500/40 rounded-xl p-6 mb-10">

                <h2 className="text-xl font-bold text-green-400 mb-5">
                  🟢 Upcoming Follow-ups
                </h2>

                <div className="space-y-3">

                  {upcomingFollowUps
                    .slice(0, 5)
                    .map(
                      (followUp) => (

                        <div
                          key={
                            followUp.id
                          }
                          className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >

                          <div>

                            <h3 className="font-semibold">
                              👤{" "}
                              {getLeadName(
                                followUp.lead_id
                              )}
                            </h3>

                            <p className="text-slate-300 mt-1">
                              {
                                followUp.title
                              }
                            </p>

                            <p className="text-green-400 text-sm mt-2">
                              Due:{" "}
                              {formatDate(
                                followUp.due_date
                              )}
                            </p>

                          </div>

                          <div className="flex gap-2">

                            <button
                              onClick={() =>
                                completeFollowUp(
                                  followUp
                                )
                              }
                              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
                            >
                              ✅ Complete
                            </button>

                            <button
                              onClick={() =>
                                deleteFollowUp(
                                  followUp.id
                                )
                              }
                              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
                            >
                              🗑
                            </button>

                          </div>

                        </div>

                      )
                    )}

                </div>

              </div>

            )}

            {/* EDIT LEAD */}

            {editingLead && (

              <div className="bg-slate-900 border border-blue-500 rounded-xl p-6 mb-10">

                <div className="flex justify-between items-center mb-6">

                  <div>

                    <h2 className="text-xl font-semibold">
                      ✏️ Edit Lead
                    </h2>

                    <p className="text-slate-400 text-sm mt-1">
                      Update lead information
                    </p>

                  </div>

                  <button
                    onClick={cancelEdit}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕ Close
                  </button>

                </div>

                <form
                  onSubmit={updateLead}
                >

                  <input
                    type="text"
                    placeholder="Lead Name *"
                    value={editName}
                    onChange={(e) =>
                      setEditName(
                        e.target.value
                      )
                    }
                    className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />

                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={editPhone}
                    onChange={(e) =>
                      setEditPhone(
                        e.target.value
                      )
                    }
                    className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />

                  <input
                    type="email"
                    placeholder="Email Address"
                    value={editEmail}
                    onChange={(e) =>
                      setEditEmail(
                        e.target.value
                      )
                    }
                    className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
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
                    className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />

                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(
                        e.target.value
                      )
                    }
                    className="w-full p-3 mb-6 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >

                    {PIPELINE_STAGES.map(
                      (stage) => (

                        <option
                          key={
                            stage.name
                          }
                          value={
                            stage.name
                          }
                        >
                          {stage.icon}{" "}
                          {stage.name}
                        </option>

                      )
                    )}

                  </select>

                  <div className="flex gap-4">

                    <button
                      type="submit"
                      disabled={
                        editLoading
                      }
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

            {/* SALES PIPELINE */}

            <div className="mb-10">

              <h2 className="text-2xl font-bold mb-5">
                📈 Sales Pipeline
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

                {PIPELINE_STAGES.map(
                  (stage) => (

                    <div
                      key={stage.name}
                      className={`bg-slate-900 border ${getStageBorderColor(
                        stage.name
                      )} rounded-xl p-5`}
                    >

                      <div className="flex justify-between">

                        <span className="text-2xl">
                          {stage.icon}
                        </span>

                        <span
                          className={`text-2xl font-bold ${getStageTextColor(
                            stage.name
                          )}`}
                        >
                          {getLeadCount(
                            stage.name
                          )}
                        </span>

                      </div>

                      <h3 className="font-bold mt-4">
                        {stage.name}
                      </h3>

                      <p className="text-slate-500 text-xs mt-1">
                        {stage.description}
                      </p>

                    </div>

                  )
                )}

              </div>

            </div>

            {/* ADD LEAD */}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-10">

              <h2 className="text-xl font-semibold mb-6">
                ➕ Add New Lead
              </h2>

              <form onSubmit={addLead}>

                <input
                  type="text"
                  placeholder="Lead Name *"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />

                <input
                  type="text"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value
                    )
                  }
                  className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />

                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />

                <input
                  type="text"
                  placeholder="Business Name"
                  value={businessName}
                  onChange={(e) =>
                    setBusinessName(
                      e.target.value
                    )
                  }
                  className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value
                    )
                  }
                  className="w-full p-3 mb-6 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >

                  {PIPELINE_STAGES.map(
                    (stage) => (

                      <option
                        key={stage.name}
                        value={stage.name}
                      >
                        {stage.icon}{" "}
                        {stage.name}
                      </option>

                    )
                  )}

                </select>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold"
                >
                  {loading
                    ? "Adding Lead..."
                    : "➕ Add Lead"}
                </button>

              </form>

            </div>

            {/* SEARCH FILTER */}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                <input
                  type="text"
                  placeholder="🔎 Search leads..."
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  className="md:col-span-2 p-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />

                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(
                      e.target.value
                    )
                  }
                  className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >

                  <option value="All">
                    All Statuses
                  </option>

                  {PIPELINE_STAGES.map(
                    (stage) => (

                      <option
                        key={stage.name}
                        value={stage.name}
                      >
                        {stage.icon}{" "}
                        {stage.name}
                      </option>

                    )
                  )}

                </select>

                <select
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(
                      e.target.value as
                        | "newest"
                        | "oldest"
                    )
                  }
                  className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >

                  <option value="newest">
                    🆕 Newest First
                  </option>

                  <option value="oldest">
                    ⏳ Oldest First
                  </option>

                </select>

              </div>

              {(search ||
                filterStatus !==
                  "All") && (

                <button
                  onClick={() => {
                    setSearch("");
                    setFilterStatus(
                      "All"
                    );
                  }}
                  className="mt-4 border border-slate-700 px-4 py-2 rounded-lg"
                >
                  ✕ Clear Filters
                </button>

              )}

            </div>

            {/* LEAD LIST */}

            <div className="flex justify-between items-center mb-6">

              <div>

                <h2 className="text-2xl font-semibold">
                  Your Leads
                </h2>

                <p className="text-slate-400 text-sm mt-1">
                  Showing{" "}
                  {filteredLeads.length} of{" "}
                  {leads.length} leads
                </p>

              </div>

              <button
                onClick={() =>
                  Promise.all([
                    fetchLeads(),
                    fetchFollowUps(),
                    fetchAllActivities(),
                  ])
                }
                className="text-blue-400 hover:text-blue-300"
              >
                🔄 Refresh
              </button>

            </div>

            {leads.length === 0 ? (

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                No leads yet.
              </div>

            ) : filteredLeads.length ===
              0 ? (

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                🔎 No leads found.
              </div>

            ) : (

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                {filteredLeads.map(
                  (lead) => {

                    const score =
                      getLeadScore(lead);

                    const category =
                      getLeadCategory(
                        score
                      );

                    return (

                      <div
                        key={lead.id}
                        className={`bg-slate-900 border ${getStageBorderColor(
                          lead.status
                        )} rounded-xl p-6`}
                      >

                        <div className="flex justify-between items-start gap-3 mb-4">

                          <div>

                            <h3 className="text-xl font-bold">
                              👤 {lead.name}
                            </h3>

                            <div className="flex gap-2 mt-3 flex-wrap">

                              <span
                                className={`${category.color} border px-3 py-1 rounded-full text-xs font-semibold`}
                              >
                                {category.icon}{" "}
                                {category.label} Lead
                              </span>

                              <span className="bg-slate-950 border border-slate-700 px-3 py-1 rounded-full text-xs text-slate-300">
                                🤖 AI Score:{" "}
                                {score}/100
                              </span>

                            </div>

                          </div>

                          <span
                            className={`${getStatusColor(
                              lead.status
                            )} px-3 py-1 rounded-full text-sm`}
                          >
                            {lead.status}
                          </span>

                        </div>

                        {lead.business_name && (

                          <p className="text-slate-300 mb-2">
                            🏢{" "}
                            {
                              lead.business_name
                            }
                          </p>

                        )}

                        {lead.phone && (

                          <p className="text-slate-300 mb-2">
                            📞 {lead.phone}
                          </p>

                        )}

                        {lead.email && (

                          <p className="text-slate-300 mb-4 break-words">
                            📧 {lead.email}
                          </p>

                        )}

                        {/* STATUS */}

                        <select
                          value={lead.status}
                          onChange={(e) =>
                            updateLeadStatus(
                              lead.id,
                              e.target.value
                            )
                          }
                          className="w-full p-2 mb-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
                        >

                          {PIPELINE_STAGES.map(
                            (stage) => (

                              <option
                                key={
                                  stage.name
                                }
                                value={
                                  stage.name
                                }
                              >
                                {
                                  stage.icon
                                }{" "}
                                {
                                  stage.name
                                }
                              </option>

                            )
                          )}

                        </select>

                        {/* ACTIONS */}

                        <div className="grid grid-cols-3 gap-2">

                          <button
                            onClick={() =>
                              openLeadTimeline(
                                lead
                              )
                            }
                            className="bg-purple-600 hover:bg-purple-700 p-2 rounded-lg text-sm"
                          >
                            📋 Timeline
                          </button>

                          <button
                            onClick={() =>
                              openEditLead(
                                lead
                              )
                            }
                            className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg text-sm"
                          >
                            ✏️ Edit
                          </button>

                          <button
                            onClick={() =>
                              deleteLead(
                                lead.id
                              )
                            }
                            className="bg-red-600 hover:bg-red-700 p-2 rounded-lg text-sm"
                          >
                            🗑 Delete
                          </button>

                        </div>

                      </div>

                    );
                  }
                )}

              </div>

            )}

            {/* LEAD TIMELINE */}

            {selectedLead && (

              <div
                id="lead-timeline"
                className="mt-10 bg-slate-900 border border-purple-500/40 rounded-xl p-6"
              >

                <div className="flex justify-between items-center mb-6">

                  <div>

                    <h2 className="text-2xl font-bold">
                      📋 Lead Activity Timeline
                    </h2>

                    <p className="text-slate-400 mt-1">
                      Complete history for{" "}

                      <span className="text-white font-semibold">
                        {selectedLead.name}
                      </span>

                    </p>

                  </div>

                  <button
                    onClick={() => {
                      setSelectedLead(
                        null
                      );

                      setActivities([]);
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕ Close
                  </button>

                </div>

                {/* ADD FOLLOW UP */}

                <form
                  onSubmit={addFollowUp}
                  className="bg-slate-950 border border-green-500/30 rounded-xl p-5 mb-6"
                >

                  <h3 className="font-semibold text-green-400 mb-4">
                    📅 Schedule Follow-up
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                    <input
                      type="text"
                      placeholder="Example: Call about pricing..."
                      value={followUpTitle}
                      onChange={(e) =>
                        setFollowUpTitle(
                          e.target.value
                        )
                      }
                      className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />

                    <input
                      type="datetime-local"
                      value={followUpDate}
                      onChange={(e) =>
                        setFollowUpDate(
                          e.target.value
                        )
                      }
                      className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />

                    <button
                      type="submit"
                      disabled={
                        followUpLoading
                      }
                      className="bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold"
                    >
                      {followUpLoading
                        ? "Scheduling..."
                        : "📅 Schedule"}
                    </button>

                  </div>

                </form>

                {/* ADD ACTIVITY */}

                <form
                  onSubmit={addActivity}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-5 mb-8"
                >

                  <h3 className="font-semibold mb-4">
                    ➕ Add Activity / Note
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

                    <select
                      value={activityType}
                      onChange={(e) =>
                        setActivityType(
                          e.target.value
                        )
                      }
                      className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    >

                      <option value="Note">
                        📝 Note
                      </option>

                      <option value="Call">
                        📞 Call
                      </option>

                      <option value="Follow-up">
                        🔥 Follow-up
                      </option>

                      <option value="WhatsApp">
                        💬 WhatsApp
                      </option>

                      <option value="Appointment">
                        📅 Appointment
                      </option>

                      <option value="Email">
                        📧 Email
                      </option>

                    </select>

                    <input
                      type="text"
                      placeholder="Add note or activity..."
                      value={
                        activityMessage
                      }
                      onChange={(e) =>
                        setActivityMessage(
                          e.target.value
                        )
                      }
                      className="md:col-span-2 p-3 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />

                    <button
                      type="submit"
                      disabled={
                        activityLoading
                      }
                      className="bg-purple-600 hover:bg-purple-700 p-3 rounded-lg font-semibold"
                    >
                      {activityLoading
                        ? "Adding..."
                        : "➕ Add"}
                    </button>

                  </div>

                </form>

                {/* ACTIVITIES */}

                {activities.length === 0 ? (

                  <div className="text-center text-slate-400 py-10">
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

                            <div className="flex justify-between gap-4">

                              <h3 className="font-semibold">
                                {
                                  activity.activity_type
                                }
                              </h3>

                              <button
                                onClick={() =>
                                  deleteActivity(
                                    activity.id
                                  )
                                }
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                🗑 Delete
                              </button>

                            </div>

                            <p className="text-slate-300 mt-2">
                              {
                                activity.activity_message
                              }
                            </p>

                            <p className="text-slate-500 text-xs mt-3">
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