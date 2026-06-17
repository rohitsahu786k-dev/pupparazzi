"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, CreditCard, Download, Eye, Grid2X2, List, Loader2, Mail, MapPin, MessageCircle, Phone, Printer, Search, Share2, Trash2, UserCheck } from "lucide-react";

type Booking = {
  id: string;
  booking_id: string;
  status: string;
  payment_status: string;
  slot_date: string;
  slot_time: string;
  notes?: string | null;
  internal_notes?: string | null;
  addons_json?: {
    pricing?: { total?: number; subtotal?: number; couponDiscount?: number; addonTotal?: number };
    payment?: { plan?: string; advanceAmount?: number; remainingCodAmount?: number; mode?: string };
    coupon?: { code?: string; discount?: number } | null;
  } | null;
  client?: { name?: string | null; email?: string | null; phone?: string | null };
  pet?: { name?: string | null; type?: string | null; breed?: string | null };
  service?: { name?: string | null; category?: string | null; price?: number | null; discounted_price?: number | null };
  address?: { line1?: string | null; city?: string | null; pincode?: string | null } | null;
  documents?: { id: string; original_name: string; path: string; document_type?: string | null }[];
};

const STATUSES = ["All", "Pending", "Confirmed", "In Progress", "Completed", "Cancelled", "Expired"];
const PAYMENT_STATUSES = ["All", "Pending", "Advance Paid", "Partially Paid", "Paid", "Failed", "Cancelled", "Refunded"];
const SERVICE_FILTERS = ["All", "Grooming", "Boarding", "Swimming", "Walking", "Veterinary", "Training"];
const PERIODS = [
  { label: "All dates", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Current", value: "current" },
  { label: "Past", value: "past" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function badgeClass(value: string) {
  if (value === "Completed" || value === "Paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (value === "Advance Paid" || value === "Partially Paid") return "bg-blue-50 text-blue-700 border-blue-200";
  if (value === "Confirmed" || value === "In Progress") return "bg-cyan-50 text-cyan-700 border-cyan-200";
  if (value === "Cancelled" || value === "Failed") return "bg-red-50 text-red-700 border-red-200";
  if (value === "Expired") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function bookingAmount(booking: Booking) {
  return Number(booking.addons_json?.pricing?.total ?? booking.service?.discounted_price ?? booking.service?.price ?? 0);
}

function paymentSummary(booking: Booking) {
  const payment = booking.addons_json?.payment;
  if (payment?.plan === "COD_ADVANCE") {
    return `COD: Rs. ${Number(payment.advanceAmount || 100).toLocaleString("en-IN")} now, Rs. ${Number(payment.remainingCodAmount || 0).toLocaleString("en-IN")} pending`;
  }
  return "Full online payment";
}

function serviceColor(category?: string | null) {
  if (category === "Grooming") return "border-pink-200 bg-pink-50 text-pink-700";
  if (category === "Swimming") return "border-sky-200 bg-sky-50 text-sky-700";
  if (category === "Boarding") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (category === "Walking") return "border-amber-200 bg-amber-50 text-amber-700";
  if (category === "Veterinary") return "border-red-200 bg-red-50 text-red-700";
  if (category === "Training") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function dateKey(value: string | Date) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [paymentStatus, setPaymentStatus] = useState("All");
  const [serviceCategory, setServiceCategory] = useState("All");
  const [period, setPeriod] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => dateKey(new Date()));
  const [viewer, setViewer] = useState<{ label: string; path: string } | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");

  async function fetchBookings() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (status !== "All") params.set("status", status);
    if (paymentStatus !== "All") params.set("paymentStatus", paymentStatus);
    if (serviceCategory !== "All") params.set("serviceCategory", serviceCategory);
    if (period !== "all") params.set("period", period);
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
  }, [status, paymentStatus, serviceCategory, period, dateFrom, dateTo]);

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
    const res = await fetch(`/api/bookings?id=${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.message || "Unable to delete booking");
    else if (data.message?.includes("cancelled")) setError(data.message);
    await fetchBookings();
    setSavingId("");
  }

  async function collectCodPayment(id: string) {
    if (!confirm("Mark remaining COD payment as collected and generate final invoice?")) return;
    await updateBooking(id, { collect_cod: true });
  }

  async function shareDocument(path: string) {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      await navigator.share({ url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
  }

  function printDocument(path: string) {
    const win = window.open(path, "_blank");
    win?.addEventListener("load", () => win.print());
  }

  function whatsappLink(booking: Booking, kind: "confirmation" | "cod" | "paid") {
    const phone = String(booking.client?.phone || "").replace(/\D/g, "");
    const number = phone.length === 10 ? `91${phone}` : phone;
    const customer = booking.client?.name || "there";
    const service = booking.service?.name || "your service";
    const amount = Number(booking.service?.discounted_price || booking.service?.price || 0).toLocaleString("en-IN");
    const message = kind === "cod"
      ? `Hello ${customer}, this is a reminder that COD amount is pending for booking #${booking.booking_id}. Please pay during service completion. Thank you.`
      : kind === "paid"
        ? `Hello ${customer}, your payment for booking #${booking.booking_id} has been completed successfully. Invoice has been generated. Thank you for choosing us.`
        : `Hello ${customer}, your booking #${booking.booking_id} for ${service} is confirmed. Total amount: Rs. ${amount}. Thank you for booking with us.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  const todayBookings = bookings.filter((booking) => new Date(booking.slot_date).toDateString() === new Date().toDateString()).length;
  const pending = bookings.filter((booking) => booking.status === "Pending").length;
  const revenue = bookings
    .filter((booking) => booking.payment_status === "Paid")
    .reduce((sum, booking) => sum + bookingAmount(booking), 0);
  const calendarDays = useMemo(() => {
    const base = selectedCalendarDate ? new Date(selectedCalendarDate) : new Date();
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return day;
    });
  }, [selectedCalendarDate]);
  const selectedDateBookings = filtered.filter((booking) => dateKey(booking.slot_date) === selectedCalendarDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage schedules, status, payments, cancellations, and customer communication.</p>
        </div>
        <Button asChild>
          <a href="/admin/bookings/new">New Booking</a>
        </Button>
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1fr_auto]">
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
          <select value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {SERVICE_FILTERS.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Button variant="outline" onClick={fetchBookings}>Refresh</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant={viewMode === "list" ? "default" : "outline"} onClick={() => setViewMode("list")}><List className="mr-1 h-3.5 w-3.5" /> List</Button>
          <Button type="button" size="sm" variant={viewMode === "calendar" ? "default" : "outline"} onClick={() => setViewMode("calendar")}><Grid2X2 className="mr-1 h-3.5 w-3.5" /> Calendar</Button>
          <Input type="date" value={selectedCalendarDate} onChange={(e) => setSelectedCalendarDate(e.target.value)} className="h-9 w-44" />
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      {viewMode === "calendar" && (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border bg-white p-4">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-2">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const key = dateKey(day);
                const dayBookings = filtered.filter((booking) => dateKey(booking.slot_date) === key);
                const active = key === selectedCalendarDate;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCalendarDate(key)}
                    className={`min-h-24 rounded-lg border p-2 text-left transition ${active ? "border-primary bg-primary/6" : "bg-white hover:border-primary/40"}`}
                  >
                    <span className="text-xs font-bold">{day.getDate()}</span>
                    <div className="mt-2 space-y-1">
                      {dayBookings.slice(0, 3).map((booking) => (
                        <span key={booking.id} className={`block truncate rounded border px-1.5 py-0.5 text-[10px] font-semibold ${serviceColor(booking.service?.category)}`}>
                          {booking.service?.category || "Service"} - {booking.pet?.name || "Pet"}
                        </span>
                      ))}
                      {dayBookings.length > 3 && <span className="block text-[10px] text-muted-foreground">+{dayBookings.length - 3} more</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <h2 className="font-bold">{new Date(selectedCalendarDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</h2>
            <div className="mt-4 space-y-3">
              {selectedDateBookings.length === 0 ? (
                <p className="rounded-lg border bg-muted/35 p-4 text-sm text-muted-foreground">No bookings for this date.</p>
              ) : selectedDateBookings.map((booking) => (
                <div key={booking.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{booking.booking_id}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{booking.client?.name || "Customer"} - {booking.pet?.name || "Pet"}</p>
                    </div>
                    <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${serviceColor(booking.service?.category)}`}>{booking.service?.category || "Service"}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{booking.service?.name || "-"} at {booking.slot_time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === "list" && <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No bookings found.</div>
        ) : (
          <>
          <div className="space-y-3 p-3 lg:hidden">
            {filtered.map((booking) => (
              <div key={booking.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{booking.booking_id}</p>
                    <p className="mt-1 truncate text-sm font-semibold">{booking.client?.name || "Customer"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{booking.service?.name || "Service"} - {booking.pet?.name || "Pet"}</p>
                  </div>
                  <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeClass(booking.status)}`}>{booking.status}</span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-primary" /> {formatDate(booking.slot_date)} at {booking.slot_time}</p>
                  <p className="flex items-start gap-1"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {booking.address ? `${booking.address.line1}, ${booking.address.city}, ${booking.address.pincode || ""}` : "-"}</p>
                  <p>{paymentSummary(booking)}</p>
                  <p className="font-bold text-foreground">Rs. {bookingAmount(booking).toLocaleString("en-IN")} - {booking.payment_status}</p>
                  {booking.documents?.length ? <p>{booking.documents.length} document(s) linked</p> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => updateBooking(booking.id, { status: "Confirmed" })}>Confirm</Button>
                  <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => updateBooking(booking.id, { payment_status: "Paid", payment_method: "Admin" })}>Paid</Button>
                  {(booking.payment_status === "Advance Paid" || booking.payment_status === "Partially Paid") && (
                    <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => collectCodPayment(booking.id)}>COD</Button>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <a href={whatsappLink(booking, booking.payment_status === "Paid" ? "paid" : booking.payment_status === "Partially Paid" ? "cod" : "confirmation")} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1120px] table-fixed text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-[150px] px-4 py-3">Booking</th>
                  <th className="w-[190px] px-4 py-3">Client</th>
                  <th className="w-[210px] px-4 py-3">Pet & Service</th>
                  <th className="w-[220px] px-4 py-3">Schedule</th>
                  <th className="w-[150px] px-4 py-3">Status</th>
                  <th className="w-[170px] px-4 py-3">Payment</th>
                  <th className="w-[170px] px-4 py-3">Internal Notes</th>
                  <th className="w-[220px] px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((booking) => (
                  <tr key={booking.id} className="align-top hover:bg-muted/30">
                    <td className="px-4 py-4">
                      <p className="font-bold text-foreground">{booking.booking_id}</p>
                      <p className="mt-1 whitespace-pre-line break-words text-xs text-muted-foreground">{booking.notes || "No customer notes"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="truncate font-semibold">{booking.client?.name || "Customer"}</p>
                      <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{booking.client?.email || "-"}</span></p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3 shrink-0" /> {booking.client?.phone || "-"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{booking.pet?.name || "Pet"} <span className="text-xs font-normal text-muted-foreground">{booking.pet?.breed || booking.pet?.type}</span></p>
                      <p className="mt-1 break-words text-xs text-muted-foreground">{booking.service?.name} - Rs. {bookingAmount(booking).toLocaleString("en-IN")}</p>
                      <span className={`mt-2 inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-bold ${serviceColor(booking.service?.category)}`}>{booking.service?.category || "Service"}</span>
                      {booking.addons_json?.coupon?.code && <p className="mt-1 text-xs font-semibold text-green-700">{booking.addons_json.coupon.code} applied</p>}
                      {booking.documents?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {booking.documents.map((doc) => (
                            <span key={doc.id} className="inline-flex items-center gap-1 rounded-lg border bg-muted/30 px-2 py-1 text-[11px] font-semibold">
                              {doc.document_type || doc.original_name}
                              <button type="button" onClick={() => setViewer({ label: doc.document_type || doc.original_name, path: doc.path })}><Eye className="h-3 w-3" /></button>
                              <a href={doc.path} download><Download className="h-3 w-3" /></a>
                              <button type="button" onClick={() => shareDocument(doc.path)}><Share2 className="h-3 w-3" /></button>
                              <button type="button" onClick={() => printDocument(doc.path)}><Printer className="h-3 w-3" /></button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <p className="flex items-center gap-1 font-semibold"><Calendar className="h-3.5 w-3.5 text-primary" /> {formatDate(booking.slot_date)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{booking.slot_time}</p>
                      <p className="mt-2 flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /> <span className="break-words">{booking.address ? `${booking.address.line1}, ${booking.address.city}, ${booking.address.pincode || ""}` : "-"}</span></p>
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
                      <p className="mt-2 text-xs text-muted-foreground">{paymentSummary(booking)}</p>
                      <select
                        value={booking.payment_status}
                        disabled={savingId === booking.id}
                        onChange={(e) => updateBooking(booking.id, { payment_status: e.target.value, payment_method: "Admin" })}
                        className="mt-2 block h-9 w-full rounded-lg border bg-white px-2 text-xs"
                      >
                        {PAYMENT_STATUSES.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <textarea
                        defaultValue={booking.internal_notes || ""}
                        onBlur={(e) => updateBooking(booking.id, { internal_notes: e.target.value })}
                        placeholder="Add private note"
                        className="h-20 w-full resize-none rounded-lg border bg-white p-2 text-xs outline-none focus:border-primary"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => updateBooking(booking.id, { status: "Confirmed" })}>
                          <UserCheck className="mr-1 h-3.5 w-3.5" /> Confirm
                        </Button>
                        <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => updateBooking(booking.id, { payment_status: "Paid", payment_method: "Admin" })}>
                          <CreditCard className="mr-1 h-3.5 w-3.5" /> Paid
                        </Button>
                        {(booking.payment_status === "Advance Paid" || booking.payment_status === "Partially Paid") && (
                          <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => collectCodPayment(booking.id)}>
                            COD
                          </Button>
                        )}
                        <Button size="sm" variant="outline" asChild>
                          <a href={whatsappLink(booking, booking.payment_status === "Paid" ? "paid" : booking.payment_status === "Partially Paid" ? "cod" : "confirmation")} target="_blank" rel="noreferrer">
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
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
          </>
        )}
      </div>}
      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewer(null)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-4">
              <p className="font-bold">{viewer.label}</p>
              <Button size="sm" variant="outline" onClick={() => setViewer(null)}>Close</Button>
            </div>
            {/\.(png|jpe?g|webp|gif)$/i.test(viewer.path) ? (
              <img src={viewer.path} alt={viewer.label} className="max-h-[75vh] w-full object-contain" />
            ) : (
              <iframe src={viewer.path} title={viewer.label} className="h-[75vh] w-full" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
