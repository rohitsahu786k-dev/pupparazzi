"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, CreditCard, Loader2, Mail, MapPin, Phone, Search, Trash2, UserCheck } from "lucide-react";

type Booking = {
  id: string;
  booking_id: string;
  status: string;
  payment_status: string;
  slot_date: string;
  slot_time: string;
  notes?: string | null;
  internal_notes?: string | null;
  client?: { name?: string | null; email?: string | null; phone?: string | null };
  pet?: { name?: string | null; type?: string | null; breed?: string | null };
  service?: { name?: string | null; price?: number | null; discounted_price?: number | null };
  address?: { line1?: string | null; city?: string | null; pincode?: string | null } | null;
};

const STATUSES = ["All", "Pending", "Confirmed", "In Progress", "Completed", "Cancelled"];
const PAYMENT_STATUSES = ["All", "Pending", "Paid", "Failed", "Refunded"];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function badgeClass(value: string) {
  if (value === "Completed" || value === "Paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (value === "Confirmed" || value === "In Progress") return "bg-cyan-50 text-cyan-700 border-cyan-200";
  if (value === "Cancelled" || value === "Failed") return "bg-red-50 text-red-700 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [paymentStatus, setPaymentStatus] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");

  async function fetchBookings() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (status !== "All") params.set("status", status);
    if (paymentStatus !== "All") params.set("paymentStatus", paymentStatus);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/bookings?${params.toString()}`);
    if (res.ok) {
      setBookings(await res.json());
    } else {
      setError("Unable to load bookings");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchBookings();
  }, [status, paymentStatus, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return bookings;
    return bookings.filter((booking) =>
      [
        booking.booking_id,
        booking.client?.name,
        booking.client?.email,
        booking.client?.phone,
        booking.pet?.name,
        booking.service?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [bookings, query]);

  async function updateBooking(id: string, body: Record<string, unknown>) {
    setSavingId(id);
    setError("");
    const res = await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Unable to update booking");
    }
    await fetchBookings();
    setSavingId("");
  }

  async function deleteBooking(id: string) {
    if (!confirm("Delete this booking permanently?")) return;
    setSavingId(id);
    await fetch(`/api/bookings?id=${id}`, { method: "DELETE" });
    await fetchBookings();
    setSavingId("");
  }

  const todayBookings = bookings.filter((booking) => new Date(booking.slot_date).toDateString() === new Date().toDateString()).length;
  const pending = bookings.filter((booking) => booking.status === "Pending").length;
  const revenue = bookings
    .filter((booking) => booking.payment_status === "Paid")
    .reduce((sum, booking) => sum + Number(booking.service?.discounted_price || booking.service?.price || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage schedules, status, payments, cancellations, and customer communication.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-muted-foreground">Today</p>
            <p className="text-xl font-bold">{todayBookings}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-muted-foreground">Pending</p>
            <p className="text-xl font-bold">{pending}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-muted-foreground">Paid</p>
            <p className="text-xl font-bold">Rs. {revenue.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search booking, client, pet, email..." className="pl-9" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {PAYMENT_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Button variant="outline" onClick={fetchBookings}>Refresh</Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No bookings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-275 text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Pet & Service</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Internal Notes</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((booking) => (
                  <tr key={booking.id} className="align-top hover:bg-muted/30">
                    <td className="px-4 py-4">
                      <p className="font-bold text-foreground">{booking.booking_id}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{booking.notes || "No customer notes"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{booking.client?.name || "Customer"}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {booking.client?.email || "-"}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {booking.client?.phone || "-"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{booking.pet?.name || "Pet"} <span className="text-xs font-normal text-muted-foreground">{booking.pet?.breed || booking.pet?.type}</span></p>
                      <p className="mt-1 text-xs text-muted-foreground">{booking.service?.name} · Rs. {Number(booking.service?.discounted_price || booking.service?.price || 0).toLocaleString("en-IN")}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="flex items-center gap-1 font-semibold"><Calendar className="h-3.5 w-3.5 text-primary" /> {formatDate(booking.slot_date)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{booking.slot_time}</p>
                      <p className="mt-2 flex max-w-55 items-start gap-1 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {booking.address ? `${booking.address.line1}, ${booking.address.city}` : booking.notes?.replace("Address: ", "") || "-"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeClass(booking.status)}`}>{booking.status}</span>
                      <select
                        value={booking.status}
                        disabled={savingId === booking.id}
                        onChange={(e) => updateBooking(booking.id, { status: e.target.value })}
                        className="mt-2 block h-9 w-36 rounded-lg border bg-white px-2 text-xs"
                      >
                        {STATUSES.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeClass(booking.payment_status)}`}>{booking.payment_status}</span>
                      <select
                        value={booking.payment_status}
                        disabled={savingId === booking.id}
                        onChange={(e) => updateBooking(booking.id, { payment_status: e.target.value, payment_method: "Admin" })}
                        className="mt-2 block h-9 w-32 rounded-lg border bg-white px-2 text-xs"
                      >
                        {PAYMENT_STATUSES.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <textarea
                        defaultValue={booking.internal_notes || ""}
                        onBlur={(e) => updateBooking(booking.id, { internal_notes: e.target.value })}
                        placeholder="Add private note"
                        className="h-20 w-48 resize-none rounded-lg border bg-white p-2 text-xs outline-none focus:border-primary"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => updateBooking(booking.id, { status: "Confirmed" })}>
                          <UserCheck className="mr-1 h-3.5 w-3.5" /> Confirm
                        </Button>
                        <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => updateBooking(booking.id, { payment_status: "Paid", payment_method: "Admin" })}>
                          <CreditCard className="mr-1 h-3.5 w-3.5" /> Paid
                        </Button>
                        <Button size="sm" variant="destructive" disabled={savingId === booking.id} onClick={() => deleteBooking(booking.id)}>
                          {savingId === booking.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </td>
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
