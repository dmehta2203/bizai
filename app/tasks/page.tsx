"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  customer_id: string | null;
  lead_id: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
};

type Lead = {
  id: string;
  name: string;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [userId, setUserId] = useState<string | null>(null);

  // ADD TASK

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [leadId, setLeadId] = useState("");

  const [loading, setLoading] = useState(false);

  // SEARCH AND FILTER

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");

  // EDIT TASK

  const [editingTask, setEditingTask] =
    useState<Task | null>(null);

  const [editTitle, setEditTitle] = useState("");

  const [editDescription, setEditDescription] =
    useState("");

  const [editPriority, setEditPriority] =
    useState("Medium");

  const [editDueDate, setEditDueDate] =
    useState("");

  const [editCustomerId, setEditCustomerId] =
    useState("");

  const [editLeadId, setEditLeadId] =
    useState("");

  const [editLoading, setEditLoading] =
    useState(false);

  useEffect(() => {
    loadUserAndData();
  }, []);

  // LOAD USER AND DATA

  async function loadUserAndData() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      setUserId(session.user.id);

      fetchTasks(session.user.id);
      fetchCustomers(session.user.id);
      fetchLeads(session.user.id);
    }
  }

  // FETCH TASKS

  async function fetchTasks(currentUserId?: string) {
    const id = currentUserId || userId;

    if (!id) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error fetching tasks:",
        error.message
      );
    } else {
      setTasks(data || []);
    }
  }

  // FETCH CUSTOMERS

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

  // FETCH LEADS

  async function fetchLeads(
    currentUserId?: string
  ) {
    const id = currentUserId || userId;

    if (!id) return;

    const { data, error } = await supabase
      .from("leads")
      .select("id, name")
      .eq("user_id", id)
      .order("name");

    if (error) {
      console.error(
        "Error fetching leads:",
        error.message
      );
    } else {
      setLeads(data || []);
    }
  }

  // GET CUSTOMER NAME

  function getCustomerName(
    selectedCustomerId: string | null
  ) {
    if (!selectedCustomerId) return null;

    return customers.find(
      (customer) =>
        customer.id === selectedCustomerId
    )?.name;
  }

  // GET LEAD NAME

  function getLeadName(
    selectedLeadId: string | null
  ) {
    if (!selectedLeadId) return null;

    return leads.find(
      (lead) =>
        lead.id === selectedLeadId
    )?.name;
  }

  // ADD TASK

  async function addTask(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!title.trim()) {
      alert("Task title is required");
      return;
    }

    if (!userId) {
      alert("Please login first");
      return;
    }

    setLoading(true);

    const { error } =
      await supabase
        .from("tasks")
        .insert([
          {
            user_id: userId,
            title: title.trim(),
            description:
              description.trim() || null,
            priority: priority,
            status: "Pending",
            due_date: dueDate || null,
            customer_id: customerId || null,
            lead_id: leadId || null,
          },
        ]);

    if (error) {
      console.error(error);
      alert(error.message);

      setLoading(false);
      return;
    }

    // CREATE TASK NOTIFICATION

    const leadName = getLeadName(leadId);

    const notificationMessage = leadName
      ? `New task "${title.trim()}" was created for lead ${leadName}.`
      : `New task "${title.trim()}" was created.`;

    await supabase
      .from("notifications")
      .insert([
        {
          user_id: userId,
          title: "📋 New Task Created",
          message: notificationMessage,
          type: "task",
        },
      ]);

    // CREATE FOLLOW-UP

    if (leadId && dueDate) {
      await supabase
        .from("follow_ups")
        .insert([
          {
            user_id: userId,
            lead_id: leadId,
            title: title.trim(),
            due_date: dueDate,
            completed: false,
          },
        ]);
    }

    alert("Task added successfully! 🎉");

    setTitle("");
    setDescription("");
    setPriority("Medium");
    setDueDate("");
    setCustomerId("");
    setLeadId("");

    await fetchTasks();

    setLoading(false);
  }

  // UPDATE TASK STATUS

  async function updateTaskStatus(
    taskId: string,
    newStatus: string
  ) {
    if (!userId) return;

    const task = tasks.find(
      (item) => item.id === taskId
    );

    const oldStatus = task?.status;

    const { error } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
      })
      .eq("id", taskId)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    // TASK COMPLETED NOTIFICATION

    if (
      newStatus === "Completed" &&
      oldStatus !== "Completed"
    ) {
      await supabase
        .from("notifications")
        .insert([
          {
            user_id: userId,
            title: "🎉 Task Completed",
            message: `Task "${task?.title}" was completed successfully.`,
            type: "success",
          },
        ]);
    }

    // TASK REOPENED NOTIFICATION

    if (
      newStatus === "Pending" &&
      oldStatus === "Completed"
    ) {
      await supabase
        .from("notifications")
        .insert([
          {
            user_id: userId,
            title: "📋 Task Reopened",
            message: `Task "${task?.title}" was marked as pending again.`,
            type: "task",
          },
        ]);
    }

    await fetchTasks();
  }

  // DELETE TASK

  async function deleteTask(taskId: string) {
    const confirmed = confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    if (!userId) return;

    const task = tasks.find(
      (item) => item.id === taskId
    );

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
    } else {
      await supabase
        .from("notifications")
        .insert([
          {
            user_id: userId,
            title: "🗑 Task Deleted",
            message: `Task "${task?.title}" was deleted.`,
            type: "warning",
          },
        ]);

      await fetchTasks();
    }
  }

  // OPEN EDIT TASK

  function openEditTask(task: Task) {
    setEditingTask(task);

    setEditTitle(task.title || "");

    setEditDescription(
      task.description || ""
    );

    setEditPriority(
      task.priority || "Medium"
    );

    setEditDueDate(
      task.due_date || ""
    );

    setEditCustomerId(
      task.customer_id || ""
    );

    setEditLeadId(
      task.lead_id || ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // UPDATE TASK

  async function updateTask(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!editingTask) return;

    if (!editTitle.trim()) {
      alert("Task title is required");
      return;
    }

    if (!userId) return;

    setEditLoading(true);

    const { error } = await supabase
      .from("tasks")
      .update({
        title: editTitle.trim(),

        description:
          editDescription.trim() || null,

        priority: editPriority,

        due_date:
          editDueDate || null,

        customer_id:
          editCustomerId || null,

        lead_id:
          editLeadId || null,
      })
      .eq("id", editingTask.id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
    } else {
      await supabase
        .from("notifications")
        .insert([
          {
            user_id: userId,
            title: "✏️ Task Updated",
            message: `Task "${editTitle.trim()}" was updated.`,
            type: "task",
          },
        ]);

      alert("Task updated successfully! 🎉");

      cancelEdit();

      await fetchTasks();
    }

    setEditLoading(false);
  }

  // CANCEL EDIT

  function cancelEdit() {
    setEditingTask(null);

    setEditTitle("");
    setEditDescription("");
    setEditPriority("Medium");
    setEditDueDate("");
    setEditCustomerId("");
    setEditLeadId("");
  }

  // CHECK OVERDUE

  function isOverdue(task: Task) {
    if (
      !task.due_date ||
      task.status === "Completed"
    ) {
      return false;
    }

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const taskDueDate = new Date(
      task.due_date
    );

    return taskDueDate < today;
  }

  // FILTER TASKS

  const filteredTasks = useMemo(() => {
    const searchText =
      search.toLowerCase().trim();

    return tasks.filter((task) => {
      const matchesSearch =
        !searchText ||
        task.title
          .toLowerCase()
          .includes(searchText) ||
        task.description
          ?.toLowerCase()
          .includes(searchText);

      const matchesStatus =
        filterStatus === "All" ||
        task.status === filterStatus;

      const matchesPriority =
        filterPriority === "All" ||
        task.priority === filterPriority;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    tasks,
    search,
    filterStatus,
    filterPriority,
  ]);

  // PRIORITY COLOR

  function getPriorityColor(
    taskPriority: string
  ) {
    switch (taskPriority) {
      case "High":
        return "bg-red-600";

      case "Medium":
        return "bg-yellow-600";

      case "Low":
        return "bg-green-600";

      default:
        return "bg-slate-600";
    }
  }

  // STATUS COLOR

  function getStatusColor(
    taskStatus: string
  ) {
    switch (taskStatus) {
      case "Completed":
        return "bg-green-600";

      case "Pending":
        return "bg-blue-600";

      default:
        return "bg-slate-600";
    }
  }

  // TASK COUNTS

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) =>
      task.status === "Completed"
  ).length;

  const pendingTasks = tasks.filter(
    (task) =>
      task.status === "Pending"
  ).length;

  const overdueTasks = tasks.filter(
    (task) => isOverdue(task)
  ).length;

  return (
    <ProtectedLayout>

      <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">

        <div className="max-w-7xl mx-auto">

          {/* HEADER */}

          <h1 className="text-3xl font-bold mb-2">
            ✅ Task Management
          </h1>

          <p className="text-slate-400 mb-8">
            Manage your business tasks and stay organized
          </p>


          {/* EDIT TASK */}

          {editingTask && (

            <div className="bg-slate-900 border border-blue-500 rounded-xl p-6 mb-10">

              <div className="flex justify-between items-center mb-6">

                <div>

                  <h2 className="text-xl font-semibold">
                    ✏️ Edit Task
                  </h2>

                  <p className="text-slate-400 text-sm mt-1">
                    Update your task information
                  </p>

                </div>

                <button
                  onClick={cancelEdit}
                  className="text-slate-400 hover:text-white"
                >
                  ✕ Close
                </button>

              </div>


              <form onSubmit={updateTask}>

                <input
                  type="text"
                  placeholder="Task Title *"
                  value={editTitle}
                  onChange={(e) =>
                    setEditTitle(e.target.value)
                  }
                  className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />


                <textarea
                  placeholder="Task Description"
                  value={editDescription}
                  onChange={(e) =>
                    setEditDescription(e.target.value)
                  }
                  className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white min-h-[100px]"
                />


                <select
                  value={editPriority}
                  onChange={(e) =>
                    setEditPriority(e.target.value)
                  }
                  className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  <option value="Low">
                    🟢 Low Priority
                  </option>

                  <option value="Medium">
                    🟡 Medium Priority
                  </option>

                  <option value="High">
                    🔴 High Priority
                  </option>
                </select>


                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) =>
                    setEditDueDate(e.target.value)
                  }
                  className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />


                <select
                  value={editCustomerId}
                  onChange={(e) => {
                    setEditCustomerId(e.target.value);

                    if (e.target.value) {
                      setEditLeadId("");
                    }
                  }}
                  className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >

                  <option value="">
                    👥 No Customer
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
                  value={editLeadId}
                  onChange={(e) => {
                    setEditLeadId(e.target.value);

                    if (e.target.value) {
                      setEditCustomerId("");
                    }
                  }}
                  className="w-full p-3 mb-6 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >

                  <option value="">
                    🎯 No Lead
                  </option>

                  {leads.map((lead) => (

                    <option
                      key={lead.id}
                      value={lead.id}
                    >
                      🎯 {lead.name}
                    </option>

                  ))}

                </select>


                <div className="flex gap-4">

                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold disabled:opacity-50"
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


          {/* TASK STATS */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

              <p className="text-slate-400 text-sm">
                📋 Total Tasks
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {totalTasks}
              </h2>

            </div>


            <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">

              <p className="text-slate-400 text-sm">
                ⏳ Pending
              </p>

              <h2 className="text-3xl font-bold text-blue-400 mt-2">
                {pendingTasks}
              </h2>

            </div>


            <div className="bg-slate-900 border border-green-500/30 rounded-xl p-5">

              <p className="text-slate-400 text-sm">
                ✅ Completed
              </p>

              <h2 className="text-3xl font-bold text-green-400 mt-2">
                {completedTasks}
              </h2>

            </div>


            <div className="bg-slate-900 border border-red-500/30 rounded-xl p-5">

              <p className="text-slate-400 text-sm">
                🚨 Overdue
              </p>

              <h2 className="text-3xl font-bold text-red-400 mt-2">
                {overdueTasks}
              </h2>

            </div>

          </div>


          {/* ADD TASK */}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-10">

            <h2 className="text-xl font-semibold mb-6">
              ➕ Add New Task
            </h2>


            <form onSubmit={addTask}>

              <input
                type="text"
                placeholder="Task Title *"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />


              <textarea
                placeholder="Task Description"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white min-h-[100px]"
              />


              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value)
                }
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              >
                <option value="Low">
                  🟢 Low Priority
                </option>

                <option value="Medium">
                  🟡 Medium Priority
                </option>

                <option value="High">
                  🔴 High Priority
                </option>
              </select>


              <input
                type="date"
                value={dueDate}
                onChange={(e) =>
                  setDueDate(e.target.value)
                }
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />


              {/* CUSTOMER */}

              <select
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);

                  if (e.target.value) {
                    setLeadId("");
                  }
                }}
                className="w-full p-3 mb-4 rounded-lg bg-slate-950 border border-slate-700 text-white"
              >

                <option value="">
                  👥 Link to Customer (Optional)
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


              {/* LEAD */}

              <select
                value={leadId}
                onChange={(e) => {
                  setLeadId(e.target.value);

                  if (e.target.value) {
                    setCustomerId("");
                  }
                }}
                className="w-full p-3 mb-6 rounded-lg bg-slate-950 border border-slate-700 text-white"
              >

                <option value="">
                  🎯 Link to Lead (Optional)
                </option>

                {leads.map((lead) => (

                  <option
                    key={lead.id}
                    value={lead.id}
                  >
                    🎯 {lead.name}
                  </option>

                ))}

              </select>


              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading
                  ? "Adding Task..."
                  : "➕ Add Task"}
              </button>

            </form>

          </div>


          {/* SEARCH FILTER */}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <input
                type="text"
                placeholder="🔎 Search tasks..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
              />


              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value)
                }
                className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
              >
                <option value="All">
                  All Statuses
                </option>

                <option value="Pending">
                  ⏳ Pending
                </option>

                <option value="Completed">
                  ✅ Completed
                </option>
              </select>


              <select
                value={filterPriority}
                onChange={(e) =>
                  setFilterPriority(e.target.value)
                }
                className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
              >
                <option value="All">
                  All Priorities
                </option>

                <option value="High">
                  🔴 High
                </option>

                <option value="Medium">
                  🟡 Medium
                </option>

                <option value="Low">
                  🟢 Low
                </option>
              </select>

            </div>

          </div>


          {/* TASK LIST */}

          <div className="flex justify-between items-center mb-6">

            <div>

              <h2 className="text-2xl font-semibold">
                Your Tasks
              </h2>

              <p className="text-slate-400 text-sm mt-1">
                Showing {filteredTasks.length} of{" "}
                {tasks.length} tasks
              </p>

            </div>


            <button
              onClick={() => fetchTasks()}
              className="text-blue-400 hover:text-blue-300"
            >
              🔄 Refresh
            </button>

          </div>


          {tasks.length === 0 ? (

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">

              No tasks yet.

              <br />

              Create your first business task! 🚀

            </div>

          ) : filteredTasks.length === 0 ? (

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">

              🔎 No tasks found.

            </div>

          ) : (

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

              {filteredTasks.map((task) => (

                <div
                  key={task.id}
                  className={`bg-slate-900 border rounded-xl p-6 ${
                    isOverdue(task)
                      ? "border-red-500"
                      : "border-slate-800"
                  }`}
                >

                  <div className="flex justify-between items-start gap-3 mb-4">

                    <h3 className="text-xl font-bold">
                      📝 {task.title}
                    </h3>


                    <span
                      className={`${getPriorityColor(
                        task.priority
                      )} px-3 py-1 rounded-full text-xs whitespace-nowrap`}
                    >
                      {task.priority}
                    </span>

                  </div>


                  {task.description && (

                    <p className="text-slate-400 mb-4">
                      {task.description}
                    </p>

                  )}


                  <div className="space-y-2 mb-5">

                    {task.due_date && (

                      <p
                        className={
                          isOverdue(task)
                            ? "text-red-400"
                            : "text-slate-300"
                        }
                      >
                        📅 Due: {task.due_date}

                        {isOverdue(task) &&
                          " 🚨 Overdue"}
                      </p>

                    )}


                    {getCustomerName(
                      task.customer_id
                    ) && (

                      <p className="text-slate-300">

                        👤 Customer:{" "}

                        {getCustomerName(
                          task.customer_id
                        )}

                      </p>

                    )}


                    {getLeadName(task.lead_id) && (

                      <p className="text-slate-300">

                        🎯 Lead:{" "}

                        {getLeadName(
                          task.lead_id
                        )}

                      </p>

                    )}

                  </div>


                  {/* STATUS */}

                  <select
                    value={task.status}
                    onChange={(e) =>
                      updateTaskStatus(
                        task.id,
                        e.target.value
                      )
                    }
                    className={`w-full p-2 mb-3 rounded-lg border border-slate-700 text-white ${getStatusColor(
                      task.status
                    )}`}
                  >
                    <option value="Pending">
                      ⏳ Pending
                    </option>

                    <option value="Completed">
                      ✅ Completed
                    </option>
                  </select>


                  <div className="grid grid-cols-2 gap-3">

                    <button
                      onClick={() =>
                        openEditTask(task)
                      }
                      className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg"
                    >
                      ✏️ Edit
                    </button>


                    <button
                      onClick={() =>
                        deleteTask(task.id)
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

    </ProtectedLayout>
  );
}