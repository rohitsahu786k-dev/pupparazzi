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
  booking?: { booking_id: string; service?: { name?: string | null }; pet?: { name?: string | null }; invoices?: { id: string; invoice_id: string; status: string }[] };
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
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-muted-foreground">Payments</p><p className="text-2xl font-bold">{totals.count}</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-muted-foreground">Successful</p><p className="text-2xl font-bold">{totals.success}</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-muted-foreground">Revenue</p><p className="text-2xl font-bold">Rs. {totals.revenue.toLocaleString("en-IN")}</p></div>
      </div>
      <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No payments found.</div>
        ) : (
          <>
          <div className="grid gap-3 p-3 lg:hidden">
            {payments.map((payment) => (
              <div key={payment.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{payment.client?.name || "Customer"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{payment.booking?.booking_id || "-"}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-green-50 px-2 py-1 text-xs font-bold text-green-700">{payment.status}</span>
                </div>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/45 p-2">
                    <p className="text-muted-foreground">Amount</p>
                    <p className="mt-1 font-bold">Rs. {Number(payment.amount).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-lg bg-muted/45 p-2">
                    <p className="text-muted-foreground">Mode</p>
                    <p className="mt-1 font-bold">{payment.mode}{payment.source ? ` - ${payment.source}` : ""}</p>
                  </div>
                  <div className="rounded-lg bg-muted/45 p-2">
                    <p className="text-muted-foreground">Date</p>
                    <p className="mt-1 font-bold">{new Date(payment.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="rounded-lg bg-muted/45 p-2">
                    <p className="text-muted-foreground">Service</p>
                    <p className="mt-1 truncate font-bold">{payment.booking?.service?.name || "-"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-225 text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Transaction</th></tr>
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
                    <td className="px-4 py-3 text-xs">
                      {payment.booking?.invoices?.length ? payment.booking.invoices.map((invoice) => (
                        <a key={invoice.id} href={`/api/admin/invoices/${invoice.id}/download`} className="mr-2 font-semibold text-primary hover:underline">{invoice.invoice_id}</a>
                      )) : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{payment.transaction_id || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
