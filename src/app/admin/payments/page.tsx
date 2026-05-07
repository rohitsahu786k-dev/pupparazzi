"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

type Payment = {
  id: string;
  amount: number;
  mode: string;
  source?: string | null;
  status: string;
  transaction_id?: string | null;
  created_at: string;
  client?: { name?: string | null; email?: string | null };
  booking?: { booking_id: string; service?: { name?: string | null }; pet?: { name?: string | null } };
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/payments")
      .then((res) => res.ok ? res.json() : [])
      .then(setPayments)
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => ({
    count: payments.length,
    success: payments.filter((p) => p.status === "Success").length,
    revenue: payments.filter((p) => p.status === "Success").reduce((sum, p) => sum + Number(p.amount || 0), 0),
  }), [payments]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments & Invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track manual and Razorpay payments.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-muted-foreground">Payments</p><p className="text-2xl font-bold">{totals.count}</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-muted-foreground">Successful</p><p className="text-2xl font-bold">{totals.success}</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-muted-foreground">Revenue</p><p className="text-2xl font-bold">Rs. {totals.revenue.toLocaleString("en-IN")}</p></div>
      </div>
      <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Transaction</th></tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3">{new Date(payment.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3">{payment.client?.name || "Customer"}<br /><span className="text-xs text-muted-foreground">{payment.client?.email}</span></td>
                    <td className="px-4 py-3">{payment.booking?.booking_id || "-"}<br /><span className="text-xs text-muted-foreground">{payment.booking?.service?.name}</span></td>
                    <td className="px-4 py-3">{payment.mode} {payment.source ? `· ${payment.source}` : ""}</td>
                    <td className="px-4 py-3"><span className="rounded-lg bg-green-50 px-2 py-1 text-xs font-bold text-green-700">{payment.status}</span></td>
                    <td className="px-4 py-3 font-bold">Rs. {Number(payment.amount).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{payment.transaction_id || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
