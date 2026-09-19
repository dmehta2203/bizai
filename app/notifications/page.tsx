"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
};

function NotificationsContent() {
  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [userId, setUserId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [filter, setFilter] = useState<
    "All" | "Unread" | "Read"
  >("All");

  useEffect(() => {
    loadUserAndNotifications();
  }, []);

  // =====================================
  // LOAD USER + NOTIFICATIONS
  // =====================================

  async function loadUserAndNotifications() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUserId(session.user.id);

        await fetchNotifications(
          session.user.id
        );
      }

    } catch (error) {

      console.error(
        "Notification loading error:",
        error
      );

    } finally {

      setLoading(false);

    }
  }

  // =====================================
  // FETCH NOTIFICATIONS
  // =====================================

  async function fetchNotifications(
    currentUserId?: string
  ) {
    const id =
      currentUserId || userId;

    if (!id) return;

    try {

      setRefreshing(true);

      const { data, error } =
        await supabase
          .from("notifications")
          .select("*")
          .eq(
            "user_id",
            id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {
        throw error;
      }

      setNotifications(
        data || []
      );

    } catch (error: any) {

      console.error(
        "Error fetching notifications:",
        error
      );

      alert(
        error.message ||
        "Unable to fetch notifications"
      );

    } finally {

      setRefreshing(false);

    }
  }

  // =====================================
  // MARK ONE AS READ
  // =====================================

  async function markAsRead(
    notificationId: string
  ) {
    if (!userId) return;

    try {

      const { error } =
        await supabase
          .from("notifications")
          .update({
            is_read: true,
          })
          .eq(
            "id",
            notificationId
          )
          .eq(
            "user_id",
            userId
          );

      if (error) {
        throw error;
      }

      setNotifications(
        (current) =>
          current.map(
            (notification) =>
              notification.id ===
              notificationId
                ? {
                    ...notification,
                    is_read: true,
                  }
                : notification
          )
      );

    } catch (error: any) {

      alert(
        error.message ||
        "Unable to mark notification as read"
      );

    }
  }

  // =====================================
  // MARK ALL AS READ
  // =====================================

  async function markAllAsRead() {
    if (!userId) return;

    const unreadNotifications =
      notifications.filter(
        (notification) =>
          !notification.is_read
      );

    if (
      unreadNotifications.length === 0
    ) {
      alert(
        "All notifications are already read!"
      );

      return;
    }

    try {

      const { error } =
        await supabase
          .from("notifications")
          .update({
            is_read: true,
          })
          .eq(
            "user_id",
            userId
          )
          .eq(
            "is_read",
            false
          );

      if (error) {
        throw error;
      }

      setNotifications(
        (current) =>
          current.map(
            (notification) => ({
              ...notification,
              is_read: true,
            })
          )
      );

    } catch (error: any) {

      alert(
        error.message ||
        "Unable to mark notifications as read"
      );

    }
  }

  // =====================================
  // DELETE ONE NOTIFICATION
  // =====================================

  async function deleteNotification(
    notificationId: string
  ) {
    if (!userId) return;

    const confirmed =
      confirm(
        "Delete this notification?"
      );

    if (!confirmed) return;

    try {

      const { error } =
        await supabase
          .from("notifications")
          .delete()
          .eq(
            "id",
            notificationId
          )
          .eq(
            "user_id",
            userId
          );

      if (error) {
        throw error;
      }

      setNotifications(
        (current) =>
          current.filter(
            (notification) =>
              notification.id !==
              notificationId
          )
      );

    } catch (error: any) {

      alert(
        error.message ||
        "Unable to delete notification"
      );

    }
  }

  // =====================================
  // DELETE ALL NOTIFICATIONS
  // =====================================

  async function deleteAllNotifications() {
    if (!userId) return;

    if (
      notifications.length === 0
    ) {
      alert(
        "No notifications to delete!"
      );

      return;
    }

    const confirmed =
      confirm(
        "Delete ALL notifications?"
      );

    if (!confirmed) return;

    try {

      const { error } =
        await supabase
          .from("notifications")
          .delete()
          .eq(
            "user_id",
            userId
          );

      if (error) {
        throw error;
      }

      setNotifications([]);

    } catch (error: any) {

      alert(
        error.message ||
        "Unable to delete notifications"
      );

    }
  }

  // =====================================
  // FILTER NOTIFICATIONS
  // =====================================

  const filteredNotifications =
    useMemo(() => {

      if (
        filter === "Unread"
      ) {
        return notifications.filter(
          (notification) =>
            !notification.is_read
        );
      }

      if (
        filter === "Read"
      ) {
        return notifications.filter(
          (notification) =>
            notification.is_read
        );
      }

      return notifications;

    }, [
      notifications,
      filter,
    ]);

  // =====================================
  // COUNTS
  // =====================================

  const totalCount =
    notifications.length;

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.is_read
    ).length;

  const readCount =
    notifications.filter(
      (notification) =>
        notification.is_read
    ).length;

  // =====================================
  // GET ICON
  // =====================================

  function getNotificationIcon(
    type: string
  ) {

    switch (
      type.toLowerCase()
    ) {

      case "follow_up":
      case "follow-up":
        return "📞";

      case "task":
        return "📋";

      case "overdue":
        return "🚨";

      case "success":
        return "🎉";

      case "warning":
        return "⚠️";

      case "payment":
        return "💰";

      case "subscription":
        return "💎";

      default:
        return "🔔";

    }

  }

  // =====================================
  // GET BORDER COLOR
  // =====================================

  function getNotificationBorder(
    type: string
  ) {

    switch (
      type.toLowerCase()
    ) {

      case "overdue":
        return "border-red-500/50";

      case "success":
        return "border-green-500/50";

      case "warning":
        return "border-yellow-500/50";

      case "task":
        return "border-blue-500/50";

      case "follow_up":
      case "follow-up":
        return "border-purple-500/50";

      case "payment":
        return "border-green-500/50";

      case "subscription":
        return "border-purple-500/50";

      default:
        return "border-slate-700";

    }

  }

  // =====================================
  // FORMAT DATE
  // =====================================

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

  // =====================================
  // LOADING
  // =====================================

  if (loading) {

    return (

      <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10 flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl animate-pulse">
            🔔
          </div>

          <p className="text-slate-400 mt-4">

            Loading notifications...

          </p>

        </div>

      </main>

    );

  }

  // =====================================
  // MAIN PAGE
  // =====================================

  return (

    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">

      <div className="max-w-6xl mx-auto">


        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-5 mb-10">

          <div>

            <h1 className="text-3xl font-bold">

              🔔 Notification Center

            </h1>

            <p className="text-slate-400 mt-2">

              Stay updated with your business activity

            </p>

          </div>


          <button
            onClick={() =>
              fetchNotifications()
            }
            disabled={refreshing}
            className="border border-slate-700 hover:border-blue-500 disabled:opacity-50 px-5 py-3 rounded-lg transition"
          >

            {refreshing
              ? "🔄 Refreshing..."
              : "🔄 Refresh"}

          </button>

        </div>


        {/* STATS */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">


          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <p className="text-slate-400 text-sm">

              🔔 Total

            </p>

            <h2 className="text-3xl font-bold mt-2">

              {totalCount}

            </h2>

          </div>


          <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5">

            <p className="text-slate-400 text-sm">

              🆕 Unread

            </p>

            <h2 className="text-3xl font-bold text-purple-400 mt-2">

              {unreadCount}

            </h2>

          </div>


          <div className="bg-slate-900 border border-green-500/30 rounded-xl p-5">

            <p className="text-slate-400 text-sm">

              👁 Read

            </p>

            <h2 className="text-3xl font-bold text-green-400 mt-2">

              {readCount}

            </h2>

          </div>

        </div>


        {/* ACTIONS */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">

          <div className="flex flex-col md:flex-row gap-4 md:justify-between md:items-center">


            <select
              value={filter}
              onChange={(e) =>
                setFilter(
                  e.target.value as
                    | "All"
                    | "Unread"
                    | "Read"
                )
              }
              className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-white"
            >

              <option value="All">
                All Notifications
              </option>

              <option value="Unread">
                🆕 Unread
              </option>

              <option value="Read">
                👁 Read
              </option>

            </select>


            <div className="flex flex-wrap gap-3">


              <button
                onClick={markAllAsRead}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg transition"
              >

                👁 Mark All Read

              </button>


              <button
                onClick={
                  deleteAllNotifications
                }
                className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg transition"
              >

                🗑 Delete All

              </button>

            </div>

          </div>

        </div>


        {/* NOTIFICATION LIST */}

        {notifications.length === 0 ? (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">

            <div className="text-5xl mb-4">

              🔔

            </div>

            <h2 className="text-xl font-semibold">

              No Notifications Yet

            </h2>

            <p className="text-slate-400 mt-2">

              Your business notifications
              will appear here.

            </p>

          </div>

        ) : filteredNotifications.length === 0 ? (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">

            No notifications found for this filter.

          </div>

        ) : (

          <div className="space-y-4">

            {filteredNotifications.map(
              (notification) => (

                <div
                  key={
                    notification.id
                  }
                  className={`bg-slate-900 border ${getNotificationBorder(
                    notification.type
                  )} rounded-xl p-5 transition hover:bg-slate-800 ${
                    notification.is_read
                      ? "opacity-70"
                      : ""
                  }`}
                >

                  <div className="flex gap-4">


                    {/* ICON */}

                    <div className="text-3xl">

                      {getNotificationIcon(
                        notification.type
                      )}

                    </div>


                    {/* CONTENT */}

                    <div className="flex-1">

                      <div className="flex flex-col md:flex-row md:justify-between gap-3">


                        <div>

                          <div className="flex items-center gap-3">

                            <h3 className="font-semibold text-lg">

                              {
                                notification.title
                              }

                            </h3>


                            {!notification.is_read && (

                              <span className="bg-purple-600 text-xs px-2 py-1 rounded-full">

                                NEW

                              </span>

                            )}

                          </div>


                          {notification.message && (

                            <p className="text-slate-400 mt-2">

                              {
                                notification.message
                              }

                            </p>

                          )}


                          <p className="text-slate-500 text-xs mt-3">

                            {formatDate(
                              notification.created_at
                            )}

                          </p>

                        </div>


                        {/* ACTION BUTTONS */}

                        <div className="flex gap-3 items-start">


                          {!notification.is_read && (

                            <button
                              onClick={() =>
                                markAsRead(
                                  notification.id
                                )
                              }
                              className="text-blue-400 hover:text-blue-300 text-sm transition"
                            >

                              👁 Read

                            </button>

                          )}


                          <button
                            onClick={() =>
                              deleteNotification(
                                notification.id
                              )
                            }
                            className="text-red-400 hover:text-red-300 text-sm transition"
                          >

                            🗑 Delete

                          </button>

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}


        {/* FOOTER */}

        <div className="text-center text-slate-500 text-sm mt-10 pb-5">

          🔔 BizAI Notification Center

        </div>


      </div>

    </main>

  );

}


// =====================================
// PROTECTED PAGE
// =====================================

export default function NotificationsPage() {

  return (

    <ProtectedRoute>

      <NotificationsContent />

    </ProtectedRoute>

  );

}