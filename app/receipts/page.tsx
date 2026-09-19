"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import { useRouter } from "next/navigation";

type Receipt = {
  id: string;
  user_id: string;
  receipt_number: string;
  plan: string;
  amount: number;
  payment_id: string;
  order_id: string;
  payment_status: string;
  billing_cycle: string;
  payment_date: string;
  subscription_start: string;
  subscription_end: string;
  created_at: string;
};

export default function ReceiptsPage() {
  const router = useRouter();

  const [receipts, setReceipts] =
    useState<Receipt[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [downloadingId, setDownloadingId] =
    useState<string | null>(null);

  useEffect(() => {
    loadReceipts();
  }, []);

  // ==============================
  // LOAD RECEIPTS
  // ==============================

  async function loadReceipts() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      const { data, error } =
        await supabase
          .from("payment_receipts")
          .select("*")
          .eq(
            "user_id",
            session.user.id
          )
          .order(
            "payment_date",
            {
              ascending: false,
            }
          );

      if (error) {
        console.error(
          "Receipt loading error:",
          error
        );

        alert(
          "Unable to load receipts: " +
          error.message
        );

        return;
      }

      setReceipts(
        data || []
      );

    } catch (error) {
      console.error(
        "Receipt error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // FORMAT MONEY
  // ==============================

  function formatMoney(
    amount: number
  ) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }
    ).format(
      Number(amount)
    );
  }

  // ==============================
  // FORMAT DATE
  // ==============================

  function formatDate(
    date: string
  ) {
    if (!date) {
      return "N/A";
    }

    return new Date(
      date
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  }

  // ==============================
  // DOWNLOAD RECEIPT PDF
  // ==============================

  function downloadReceipt(
    receipt: Receipt
  ) {
    try {
      setDownloadingId(
        receipt.id
      );

      const pdf =
        new jsPDF();

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      // ==============================
      // HEADER
      // ==============================

      pdf.setFontSize(24);
      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.text(
        "BizAI",
        pageWidth / 2,
        25,
        {
          align: "center",
        }
      );

      pdf.setFontSize(11);

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.text(
        "AI Powered Business Management",
        pageWidth / 2,
        33,
        {
          align: "center",
        }
      );

      // ==============================
      // TITLE
      // ==============================

      pdf.setFontSize(20);

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.text(
        "PAYMENT RECEIPT",
        pageWidth / 2,
        50,
        {
          align: "center",
        }
      );

      // ==============================
      // LINE
      // ==============================

      pdf.line(
        20,
        58,
        pageWidth - 20,
        58
      );

      // ==============================
      // RECEIPT DETAILS
      // ==============================

      let y = 75;

      function addRow(
        label: string,
        value: string
      ) {
        pdf.setFont(
          "helvetica",
          "bold"
        );

        pdf.text(
          label,
          25,
          y
        );

        pdf.setFont(
          "helvetica",
          "normal"
        );

        pdf.text(
          value,
          85,
          y
        );

        y += 12;
      }

      addRow(
        "Receipt No:",
        receipt.receipt_number
      );

      addRow(
        "Payment Status:",
        receipt.payment_status
      );

      addRow(
        "Plan:",
        receipt.plan
      );

      addRow(
        "Amount Paid:",
        formatMoney(
          receipt.amount
        )
      );

      addRow(
        "Billing Cycle:",
        receipt.billing_cycle
      );

      addRow(
        "Payment Date:",
        formatDate(
          receipt.payment_date
        )
      );

      addRow(
        "Subscription Start:",
        formatDate(
          receipt.subscription_start
        )
      );

      addRow(
        "Subscription End:",
        formatDate(
          receipt.subscription_end
        )
      );

      // ==============================
      // PAYMENT DETAILS
      // ==============================

      y += 10;

      pdf.setFontSize(14);

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.text(
        "Payment Details",
        25,
        y
      );

      y += 12;

      pdf.setFontSize(10);

      addRow(
        "Payment ID:",
        receipt.payment_id
      );

      addRow(
        "Order ID:",
        receipt.order_id
      );

      // ==============================
      // FOOTER
      // ==============================

      const pageHeight =
        pdf.internal.pageSize.getHeight();

      pdf.setFontSize(10);

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.text(
        "Thank you for choosing BizAI!",
        pageWidth / 2,
        pageHeight - 25,
        {
          align: "center",
        }
      );

      pdf.text(
        "This is a computer-generated receipt.",
        pageWidth / 2,
        pageHeight - 18,
        {
          align: "center",
        }
      );

      // ==============================
      // SAVE PDF
      // ==============================

      pdf.save(
        `BizAI-Receipt-${receipt.receipt_number}.pdf`
      );

    } catch (error) {

      console.error(
        "PDF download error:",
        error
      );

      alert(
        "Unable to download receipt."
      );

    } finally {

      setTimeout(() => {
        setDownloadingId(null);
      }, 500);

    }
  }

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">

          <div className="text-5xl mb-4">
            🧾
          </div>

          <p className="text-slate-400">
            Loading your receipts...
          </p>

        </div>
      </main>
    );
  }

  // ==============================
  // PAGE
  // ==============================

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-6xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>

            <h1 className="text-3xl md:text-4xl font-bold">
              🧾 Payment Receipts
            </h1>

            <p className="text-slate-400 mt-2">
              View and download your BizAI payment receipts.
            </p>

          </div>

          <div className="flex gap-3">

            <button
              onClick={loadReceipts}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-3 rounded-xl"
            >
              🔄 Refresh
            </button>

            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold"
            >
              📊 Dashboard
            </button>

          </div>

        </div>

        {/* RECEIPTS */}

        {receipts.length === 0 ? (

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">

            <div className="text-6xl mb-5">
              🧾
            </div>

            <h2 className="text-xl font-bold">
              No Payment Receipts Yet
            </h2>

            <p className="text-slate-400 mt-2">
              Your payment receipts will appear here after a successful subscription payment.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {receipts.map(
              (receipt) => (

                <div
                  key={receipt.id}
                  className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 transition"
                >

                  {/* RECEIPT HEADER */}

                  <div className="flex items-start justify-between gap-4 mb-6">

                    <div>

                      <p className="text-slate-400 text-sm">
                        RECEIPT
                      </p>

                      <h2 className="font-bold text-lg mt-1">
                        {receipt.receipt_number}
                      </h2>

                    </div>

                    <span className="bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-1 rounded-full text-sm">
                      ✓ Paid
                    </span>

                  </div>

                  {/* PLAN */}

                  <div className="mb-5">

                    <p className="text-slate-400 text-sm">
                      Subscription Plan
                    </p>

                    <p className="text-xl font-bold mt-1 text-purple-400">
                      👑 {receipt.plan}
                    </p>

                  </div>

                  {/* AMOUNT */}

                  <div className="mb-5">

                    <p className="text-slate-400 text-sm">
                      Amount Paid
                    </p>

                    <p className="text-3xl font-bold mt-1 text-green-400">
                      {formatMoney(
                        receipt.amount
                      )}
                    </p>

                  </div>

                  {/* DATE */}

                  <div className="border-t border-slate-800 pt-4 mb-5">

                    <div className="flex justify-between text-sm">

                      <span className="text-slate-400">
                        Payment Date
                      </span>

                      <span>
                        {formatDate(
                          receipt.payment_date
                        )}
                      </span>

                    </div>

                    <div className="flex justify-between text-sm mt-3">

                      <span className="text-slate-400">
                        Valid Until
                      </span>

                      <span>
                        {formatDate(
                          receipt.subscription_end
                        )}
                      </span>

                    </div>

                  </div>

                  {/* DOWNLOAD BUTTON */}

                  <button
                    onClick={() =>
                      downloadReceipt(
                        receipt
                      )
                    }
                    disabled={
                      downloadingId ===
                      receipt.id
                    }
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-3 rounded-xl font-semibold"
                  >
                    {downloadingId ===
                    receipt.id
                      ? "Generating PDF..."
                      : "⬇ Download Receipt PDF"}
                  </button>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </main>
  );
}