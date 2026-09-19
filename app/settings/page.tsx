"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type BusinessProfile = {
  id?: string;
  user_id?: string;

  business_name: string;
  owner_name: string;
  business_email: string;
  phone: string;
  business_category: string;
  business_address: string;
  business_description: string;
};

export default function SettingsPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [userId, setUserId] =
    useState<string | null>(null);

  const [profile, setProfile] =
    useState<BusinessProfile>({
      business_name: "",
      owner_name: "",
      business_email: "",
      phone: "",
      business_category: "",
      business_address: "",
      business_description: "",
    });

  // ======================================
  // LOAD PROFILE
  // ======================================

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);

      // ==============================
      // GET LOGGED IN USER
      // ==============================

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      const currentUserId =
        session.user.id;

      setUserId(currentUserId);

      // ==============================
      // LOAD BUSINESS PROFILE
      // ==============================

      const {
        data,
        error,
      } =
        await supabase
          .from("business_profiles")
          .select("*")
          .eq(
            "user_id",
            currentUserId
          )
          .maybeSingle();

      if (error) {
        console.error(
          "Profile load error:",
          error
        );

        setMessage(
          "Unable to load business profile."
        );

        return;
      }

      // ==============================
      // IF PROFILE EXISTS
      // ==============================

      if (data) {
        setProfile({
          business_name:
            data.business_name || "",

          owner_name:
            data.owner_name || "",

          business_email:
            data.business_email || "",

          phone:
            data.phone || "",

          business_category:
            data.business_category || "",

          business_address:
            data.business_address || "",

          business_description:
            data.business_description || "",
        });
      }

    } catch (error) {
      console.error(
        "Settings error:",
        error
      );

      setMessage(
        "Something went wrong."
      );

    } finally {
      setLoading(false);
    }
  }

  // ======================================
  // HANDLE INPUT CHANGE
  // ======================================

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement |
      HTMLSelectElement
    >
  ) {
    const {
      name,
      value,
    } = e.target;

    setProfile(
      (current) => ({
        ...current,

        [name]: value,
      })
    );

    // Clear old message

    if (message) {
      setMessage("");
    }
  }

  // ======================================
  // SAVE PROFILE
  // ======================================

  async function handleSave() {
    try {
      if (!userId) {
        return;
      }

      setSaving(true);

      setMessage("");

      // ==============================
      // VALIDATE BUSINESS NAME
      // ==============================

      if (
        !profile.business_name.trim()
      ) {
        setMessage(
          "⚠️ Business name is required."
        );

        return;
      }

      // ==============================
      // UPSERT PROFILE
      // ==============================

      const {
        error,
      } =
        await supabase
          .from("business_profiles")
          .upsert(
            {
              user_id: userId,

              business_name:
                profile.business_name.trim(),

              owner_name:
                profile.owner_name.trim(),

              business_email:
                profile.business_email.trim(),

              phone:
                profile.phone.trim(),

              business_category:
                profile.business_category,

              business_address:
                profile.business_address.trim(),

              business_description:
                profile.business_description.trim(),

              updated_at:
                new Date().toISOString(),
            },

            {
              onConflict:
                "user_id",
            }
          );

      if (error) {
        console.error(
          "Profile save error:",
          error
        );

        setMessage(
          "❌ " + error.message
        );

        return;
      }

      setMessage(
        "✅ Business profile saved successfully!"
      );

    } catch (error) {
      console.error(
        "Save error:",
        error
      );

      setMessage(
        "❌ Something went wrong while saving."
      );

    } finally {
      setSaving(false);
    }
  }

  // ======================================
  // LOADING
  // ======================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-4">
            ⚙️
          </div>

          <p className="text-slate-400">
            Loading business settings...
          </p>

        </div>

      </main>
    );
  }

  // ======================================
  // PAGE
  // ======================================

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-4xl mx-auto">

        {/* ============================== */}
        {/* HEADER */}
        {/* ============================== */}

        <div className="mb-8">

          <h1 className="text-3xl md:text-4xl font-bold">
            ⚙️ Business Settings
          </h1>

          <p className="text-slate-400 mt-2">
            Manage your business profile and
            personalize your BizAI experience.
          </p>

        </div>

        {/* ============================== */}
        {/* INFO CARD */}
        {/* ============================== */}

        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/20 rounded-2xl p-5 mb-8">

          <div className="flex gap-4">

            <div className="text-3xl">
              🤖
            </div>

            <div>

              <h2 className="font-semibold">
                Personalize BizAI
              </h2>

              <p className="text-slate-400 text-sm mt-1">

                Your business information will help
                BizAI provide more personalized
                insights and recommendations.

              </p>

            </div>

          </div>

        </div>

        {/* ============================== */}
        {/* SUCCESS / ERROR MESSAGE */}
        {/* ============================== */}

        {message && (

          <div
            className={`mb-6 p-4 rounded-xl border ${
              message.startsWith("✅")
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {message}
          </div>

        )}

        {/* ============================== */}
        {/* FORM */}
        {/* ============================== */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">

          <h2 className="text-xl font-bold mb-6">
            🏢 Business Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* BUSINESS NAME */}

            <div>

              <label className="block text-sm font-medium mb-2">
                Business Name *
              </label>

              <input
                type="text"
                name="business_name"
                value={
                  profile.business_name
                }
                onChange={
                  handleChange
                }
                placeholder="Enter business name"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3"
              />

            </div>

            {/* OWNER NAME */}

            <div>

              <label className="block text-sm font-medium mb-2">
                Owner Name
              </label>

              <input
                type="text"
                name="owner_name"
                value={
                  profile.owner_name
                }
                onChange={
                  handleChange
                }
                placeholder="Enter owner name"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3"
              />

            </div>

            {/* EMAIL */}

            <div>

              <label className="block text-sm font-medium mb-2">
                Business Email
              </label>

              <input
                type="email"
                name="business_email"
                value={
                  profile.business_email
                }
                onChange={
                  handleChange
                }
                placeholder="business@email.com"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3"
              />

            </div>

            {/* PHONE */}

            <div>

              <label className="block text-sm font-medium mb-2">
                Phone Number
              </label>

              <input
                type="tel"
                name="phone"
                value={
                  profile.phone
                }
                onChange={
                  handleChange
                }
                placeholder="+91 9876543210"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3"
              />

            </div>

            {/* CATEGORY */}

            <div className="md:col-span-2">

              <label className="block text-sm font-medium mb-2">
                Business Category
              </label>

              <select
                name="business_category"
                value={
                  profile.business_category
                }
                onChange={
                  handleChange
                }
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3"
              >

                <option value="">
                  Select business category
                </option>

                <option value="Retail">
                  Retail
                </option>

                <option value="E-Commerce">
                  E-Commerce
                </option>

                <option value="Technology">
                  Technology
                </option>

                <option value="Marketing">
                  Marketing
                </option>

                <option value="Consulting">
                  Consulting
                </option>

                <option value="Healthcare">
                  Healthcare
                </option>

                <option value="Education">
                  Education
                </option>

                <option value="Real Estate">
                  Real Estate
                </option>

                <option value="Finance">
                  Finance
                </option>

                <option value="Restaurant">
                  Restaurant / Food
                </option>

                <option value="Other">
                  Other
                </option>

              </select>

            </div>

            {/* ADDRESS */}

            <div className="md:col-span-2">

              <label className="block text-sm font-medium mb-2">
                Business Address
              </label>

              <textarea
                name="business_address"
                value={
                  profile.business_address
                }
                onChange={
                  handleChange
                }
                placeholder="Enter business address"
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3 resize-none"
              />

            </div>

            {/* DESCRIPTION */}

            <div className="md:col-span-2">

              <label className="block text-sm font-medium mb-2">
                Business Description
              </label>

              <textarea
                name="business_description"
                value={
                  profile.business_description
                }
                onChange={
                  handleChange
                }
                placeholder="Tell us what your business does..."
                rows={5}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 outline-none rounded-xl px-4 py-3 resize-none"
              />

              <p className="text-xs text-slate-500 mt-2">
                This helps BizAI understand your
                business better.
              </p>

            </div>

          </div>

          {/* ============================== */}
          {/* SAVE BUTTON */}
          {/* ============================== */}

          <div className="mt-8 flex justify-end">

            <button
              onClick={
                handleSave
              }
              disabled={
                saving
              }
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-7 py-3 rounded-xl font-semibold transition"
            >

              {saving
                ? "💾 Saving..."
                : "💾 Save Business Profile"}

            </button>

          </div>

        </div>

        {/* ============================== */}
        {/* AI INFO */}
        {/* ============================== */}

        <div className="mt-8 bg-slate-900 border border-purple-500/20 rounded-2xl p-6">

          <h2 className="text-lg font-bold">
            🤖 How BizAI Will Use This
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">

            <div className="bg-slate-950 rounded-xl p-4">

              <div className="text-2xl">
                🧠
              </div>

              <h3 className="font-semibold mt-3">
                Understand
              </h3>

              <p className="text-slate-400 text-sm mt-2">
                BizAI understands your business
                category and operations.
              </p>

            </div>

            <div className="bg-slate-950 rounded-xl p-4">

              <div className="text-2xl">
                📊
              </div>

              <h3 className="font-semibold mt-3">
                Analyze
              </h3>

              <p className="text-slate-400 text-sm mt-2">
                Get more relevant business
                insights and performance analysis.
              </p>

            </div>

            <div className="bg-slate-950 rounded-xl p-4">

              <div className="text-2xl">
                🚀
              </div>

              <h3 className="font-semibold mt-3">
                Recommend
              </h3>

              <p className="text-slate-400 text-sm mt-2">
                Receive personalized suggestions
                to help grow your business.
              </p>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}