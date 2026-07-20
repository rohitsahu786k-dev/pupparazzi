"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, CalendarPlus, ChevronDown, ChevronUp, CreditCard, Download, Edit3, Eye, Filter, Grid2X2, List, Loader2, Mail, MapPin, MessageCircle, Phone, Printer, Save, Search, Share2, Trash2, UserCheck, UserPlus } from "lucide-react";
import { canExtendBooking, quoteExtension } from "@/lib/booking-extension";

type Booking = {
  id: string;
  client_id: string;
  booking_id: string;
  created_at?: string;
  status: string;
  payment_status: string;
  slot_date: string;
  slot_time: string;
  notes?: string | null;
  internal_notes?: string | null;
  addons_json?: {
    pricing?: { total?: number; subtotal?: number; couponDiscount?: number; manualDiscount?: number; discountTotal?: number; addonTotal?: number };
    payment?: { plan?: string; advanceAmount?: number; remainingCodAmount?: number; mode?: string };
    coupon?: { code?: string; discount?: number } | null;
    discount?: { type?: string; value?: number; reason?: string | null } | null;
  } | null;
  client?: { name?: string | null; email?: string | null; phone?: string | null };
  pet?: { name?: string | null; type?: string | null; breed?: string | null };
  service?: { name?: string | null; category?: string | null; price?: number | null; discounted_price?: number | null };
  address?: { id?: string; line1?: string | null; city?: string | null; state?: string | null; pincode?: string | null; phone?: string | null } | null;
  documents?: { id: string; original_name: string; path: string; document_type?: string | null }[];
  payments?: { id: string; amount: number; mode: string; source?: string | null; status: string; transaction_id?: string | null; created_at: string }[];
  invoices?: { id: string; invoice_id: string; total: number; status: string; created_at: string }[];
  final_amount?: number | null;
  discount_type?: string | null;
  discount_value?: number | null;
  discount_amount?: number | null;
  discount_reason?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  extension_status?: string | null;
  extension_check_out_date?: string | null;
  extension_check_out_time?: string | null;
  extension_extra_amount?: number | null;
  extension_note?: string | null;
};

type ClientOption = { id: string; name?: string | null; phone?: string | null; email?: string | null };
type BookingEditDraft = {
  slot_date: string;
  slot_time: string;
  final_amount: string;
  discount_type: "" | "PERCENT" | "FLAT";
  discount_value: string;
  discount_reason: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  address_line1: string;
  address_city: string;
  address_state: string;
  address_pincode: string;
  address_phone: string;
};

const STATUSES = ["All", "Pending", "Confirmed", "In Progress", "Completed", "Cancelled", "Expired"];
const PAYMENT_STATUSES = ["All", "Pending", "Advance Paid", "Partially Paid", "Paid", "Failed", "Cancelled", "Refunded"];
const SERVICE_FILTERS = ["All", "Grooming", "Boarding"];
// Tabs overlap by design: a confirmed booking scheduled today counts under both
// Today and Active, so these badges are not expected to add up to "All".
const PERIOD_TABS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Active", value: "active" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Past", value: "past" },
] as const;

type BookingMetrics = { serviceToday: number; bookedToday: number; collectedToday: number; paidLabel: string; timezone: string };
type PeriodCounts = { all: number; today: number; active: number; upcoming: number; past: number; metrics?: BookingMetrics };

const EMPTY_COUNTS: PeriodCounts = { all: 0, today: 0, active: 0, upcoming: 0, past: 0 };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function badgeClass(value: string) {
  if (value === "Completed" || value === "Paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (value === "Advance Paid" || value === "Partially Paid") return "bg-blue-50 text-blue-700 border-blue-200";
  if (value === "Confirmed" || value === "In Progress") return "bg-cyan-50 text-cyan-700 border-cyan-200";
  if (value === "Cancelled" || value === "Failed") return "bg-red-50 text-red-700 border-red-200";
  if (value === "Expired") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

/** Price before discounts. final_amount is the admin's override of the subtotal, not the payable. */
function bookingSubtotal(booking: Booking) {
  return Number(
    booking.final_amount
    ?? booking.addons_json?.pricing?.subtotal
    ?? booking.service?.discounted_price
    ?? booking.service?.price
    ?? 0,
  );
}

function bookingDiscount(booking: Booking) {
  const pricing = booking.addons_json?.pricing;
  const coupon = Number(pricing?.couponDiscount ?? booking.addons_json?.coupon?.discount ?? 0);
  const manual = Number(pricing?.manualDiscount ?? booking.discount_amount ?? 0);
  return { coupon, manual, total: Math.min(bookingSubtotal(booking), coupon + manual) };
}

/** What the customer actually pays. The server keeps pricing.total authoritative. */
function bookingAmount(booking: Booking) {
  const stored = booking.addons_json?.pricing?.total;
  if (stored != null) return Number(stored);
  return Math.max(0, bookingSubtotal(booking) - bookingDiscount(booking).total);
}

function paymentSummary(booking: Booking) {
  const payment = booking.addons_json?.payment;
  if (payment?.plan === "COD_ADVANCE") {
    return `COD: ₹${Number(payment.advanceAmount || 100).toLocaleString("en-IN")} now, ₹${Number(payment.remainingCodAmount || 0).toLocaleString("en-IN")} pending`;
  }
  return "Full online payment";
}

function money(value: unknown) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function paymentHistory(booking: Booking) {
  const payments = booking.payments || [];
  const invoices = booking.invoices || [];
  if (!payments.length && !invoices.length) return null;
  return (
    <div className="mt-2 space-y-1 rounded-lg border bg-muted/25 p-2 text-xs">
      {payments.map((payment) => (
        <div key={payment.id} className="border-b border-border/60 pb-1 last:border-b-0 last:pb-0">
          <p className="font-semibold">{money(payment.amount)} - {payment.status}</p>
          <p className="text-muted-foreground">{new Date(payment.created_at).toLocaleString("en-IN")} - {payment.mode}{payment.source ? ` / ${payment.source}` : ""}</p>
          {payment.transaction_id && <p className="break-all text-muted-foreground">Txn: {payment.transaction_id}</p>}
        </div>
      ))}
      {invoices.map((invoice) => (
        <div key={invoice.id} className="border-b border-border/60 pb-1 last:border-b-0 last:pb-0">
          <p className="font-semibold">{invoice.invoice_id} - {money(invoice.total)}</p>
          <p className="text-muted-foreground">{invoice.status} - {new Date(invoice.created_at).toLocaleString("en-IN")}</p>
        </div>
      ))}
    </div>
  );
}

function serviceColor(category?: string | null) {
  if (category === "Grooming") return "border-pink-200 bg-pink-50 text-pink-700";
  if (category === "Boarding") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function detailsLink(booking: Booking) {
  const category = booking.service?.category?.toLowerCase();
  if (category !== "boarding" && category !== "grooming") return "";
  return `/dashboard/bookings/${booking.id}/details?service=${category}`;
}

function dateKey(value: string | Date) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Percent or rupee discount with a live preview of what the customer will pay.
 * The preview mirrors the server's rule (manual discount comes off what is left
 * after the coupon) but the server always recomputes — this is display only.
 */
function DiscountEditor({
  draft,
  booking,
  onChange,
}: {
  draft: BookingEditDraft;
  booking: Booking;
  onChange: (patch: Partial<BookingEditDraft>) => void;
}) {
  const subtotal = Number(draft.final_amount || 0);
  const couponDiscount = bookingDiscount(booking).coupon;
  const value = Number(draft.discount_value || 0);
  const base = Math.max(0, subtotal - couponDiscount);
  const manualDiscount = !draft.discount_type || value <= 0
    ? 0
    : draft.discount_type === "PERCENT"
      ? Math.round((base * Math.min(100, value)) / 100 * 100) / 100
      : Math.min(base, value);
  const payable = Math.max(0, subtotal - couponDiscount - manualDiscount);
  const invalidPercent = draft.discount_type === "PERCENT" && value > 100;

  return (
    <div className="mt-2 rounded-lg border border-dashed bg-muted/20 p-2">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Discount</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <select
          value={draft.discount_type}
          onChange={(e) => onChange({ discount_type: e.target.value as BookingEditDraft["discount_type"] })}
          className="h-9 rounded-lg border bg-white px-2 text-xs"
          aria-label="Discount type"
        >
          <option value="">No discount</option>
          <option value="PERCENT">Percent (%)</option>
          <option value="FLAT">Amount (Rs.)</option>
        </select>
        <Input
          type="number"
          min="0"
          max={draft.discount_type === "PERCENT" ? 100 : undefined}
          value={draft.discount_value}
          disabled={!draft.discount_type}
          onChange={(e) => onChange({ discount_value: e.target.value })}
          placeholder={draft.discount_type === "PERCENT" ? "e.g. 10" : "e.g. 250"}
          className="h-9 text-xs"
          aria-label="Discount value"
        />
        <Input
          value={draft.discount_reason}
          disabled={!draft.discount_type}
          onChange={(e) => onChange({ discount_reason: e.target.value })}
          placeholder="Reason (optional)"
          className="h-9 text-xs"
          aria-label="Discount reason"
        />
      </div>
      {invalidPercent && <p className="mt-1 text-[11px] font-medium text-red-600">Percentage cannot be more than 100%.</p>}
      <div className="mt-2 space-y-0.5 text-[11px]">
        <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        {couponDiscount > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Coupon{booking.addons_json?.coupon?.code ? ` (${booking.addons_json.coupon.code})` : ""}</span>
            <span>- {money(couponDiscount)}</span>
          </div>
        )}
        {manualDiscount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Discount{draft.discount_type === "PERCENT" ? ` (${value}%)` : ""}</span>
            <span>- {money(manualDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-1 font-bold text-foreground"><span>Payable</span><span>{money(payable)}</span></div>
      </div>
    </div>
  );
}

/**
 * Extend a boarding stay, and review a client's pending extension request.
 * Only rendered for boarding bookings that are still active — quoteExtension is
 * the same function the server prices with, so the preview cannot disagree.
 */
function ExtendPanel({
  booking,
  busy,
  onExtend,
  onDecide,
}: {
  booking: Booking;
  busy: boolean;
  onExtend: (checkOutDate: string, checkOutTime: string, note: string) => void;
  onDecide: (action: "approve" | "reject") => void;
}) {
  const [checkOutDate, setCheckOutDate] = useState(() => (booking.check_out_date ? dateKey(booking.check_out_date) : ""));
  const [checkOutTime, setCheckOutTime] = useState(booking.check_out_time || "");
  const [note, setNote] = useState("");

  if (!canExtendBooking(booking as any)) return null;

  const pending = booking.extension_status === "Requested";
  const quote = quoteExtension(booking as any, checkOutDate || null, checkOutTime || null);

  return (
    <div className="mt-2 rounded-lg border bg-white p-3">
      <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <CalendarPlus className="h-3 w-3" /> Extend stay
      </p>

      {pending && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs">
          <p className="font-bold text-amber-900">Client requested an extension</p>
          <p className="mt-0.5 text-amber-800">
            New check-out: {booking.extension_check_out_date ? formatDate(booking.extension_check_out_date) : "-"} {booking.extension_check_out_time || ""}
            {booking.extension_extra_amount ? ` · Extra ${money(booking.extension_extra_amount)}` : ""}
          </p>
          {booking.extension_note && <p className="mt-0.5 italic text-amber-800">&ldquo;{booking.extension_note}&rdquo;</p>}
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => onDecide("approve")}>Approve</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onDecide("reject")}>Reject</Button>
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <Input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="h-9 text-xs" aria-label="New check-out date" />
        <Input value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} placeholder="Check-out time" className="h-9 text-xs" aria-label="New check-out time" />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-9 text-xs" aria-label="Extension note" />
      </div>

      {quote.ok ? (
        <div className="mt-2 space-y-0.5 text-[11px]">
          <div className="flex justify-between text-muted-foreground"><span>{quote.currentSlab} &rarr; {quote.newSlab}</span><span>{quote.currentHours}h &rarr; {quote.newHours}h</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Extra charge</span><span>+ {money(quote.extraAmount)}</span></div>
          <div className="flex justify-between border-t pt-1 font-bold"><span>New payable</span><span>{money(quote.newTotal)}</span></div>
        </div>
      ) : (
        quote.error && (checkOutDate || checkOutTime) && <p className="mt-1 text-[11px] font-medium text-red-600">{quote.error}</p>
      )}

      <Button
        size="sm"
        className="mt-2 w-full"
        disabled={busy || !quote.ok}
        onClick={() => onExtend(checkOutDate, checkOutTime, note)}
      >
        {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="mr-1 h-3.5 w-3.5" />}
        Extend stay
      </Button>
    </div>
  );
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState("");
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
  const [editDrafts, setEditDrafts] = useState<Record<string, BookingEditDraft>>({});
  const [counts, setCounts] = useState<PeriodCounts>(EMPTY_COUNTS);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The filters every request shares. The counts endpoint gets the same ones (minus
  // the period itself) so each badge matches what its tab will actually show.
  function baseParams() {
    const params = new URLSearchParams();
    if (status !== "All") params.set("status", status);
    if (paymentStatus !== "All") params.set("paymentStatus", paymentStatus);
    if (serviceCategory !== "All") params.set("serviceCategory", serviceCategory);
    if (clientId) params.set("userId", clientId);
    return params;
  }

  async function fetchBookings() {
    setLoading(true);
    setError("");
    const params = baseParams();
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

  async function fetchCounts() {
    const res = await fetch(`/api/bookings/counts?${baseParams().toString()}`);
    if (!res.ok) return setCounts(EMPTY_COUNTS);
    const data = await res.json().catch(() => null);
    setCounts(data && typeof data === "object" ? { ...EMPTY_COUNTS, ...data } : EMPTY_COUNTS);
  }

  useEffect(() => {
    fetchBookings();
  }, [status, paymentStatus, serviceCategory, period, dateFrom, dateTo, clientId]);

  // Counts do not depend on the selected tab, so they are not refetched when it changes.
  useEffect(() => {
    fetchCounts();
  }, [status, paymentStatus, serviceCategory, clientId]);

  useEffect(() => {
    fetch("/api/admin/users?role=CLIENT")
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]));
  }, []);

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

  const activeFilterCount = [
    clientId,
    status !== "All",
    paymentStatus !== "All",
    serviceCategory !== "All",
    dateFrom,
    dateTo,
    period !== "all",
  ].filter(Boolean).length;

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
    await Promise.all([fetchBookings(), fetchCounts()]);
    setSavingId("");
  }

  async function deleteBooking(id: string) {
    if (!confirm("Delete this booking permanently?")) return;
    setSavingId(id);
    const res = await fetch(`/api/bookings?id=${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.message || "Unable to delete booking");
    else if (data.message?.includes("cancelled")) setError(data.message);
    await Promise.all([fetchBookings(), fetchCounts()]);
    setSavingId("");
  }

  async function extendBooking(id: string, checkOutDate: string, checkOutTime: string, note: string) {
    setSavingId(id);
    setError("");
    const res = await fetch("/api/bookings/extend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, check_out_date: checkOutDate, check_out_time: checkOutTime, note }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Unable to extend booking");
    }
    await Promise.all([fetchBookings(), fetchCounts()]);
    setSavingId("");
  }

  async function decideExtension(id: string, action: "approve" | "reject") {
    if (!confirm(action === "approve" ? "Approve this extension request?" : "Reject this extension request?")) return;
    setSavingId(id);
    setError("");
    const res = await fetch("/api/bookings/extend", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Unable to update the extension request");
    }
    await Promise.all([fetchBookings(), fetchCounts()]);
    setSavingId("");
  }

  async function collectCodPayment(id: string) {
    if (!confirm("Mark remaining COD payment as collected and generate final invoice?")) return;
    await updateBooking(id, { collect_cod: true });
  }

  // Confirm the booking once the pet has arrived at the store.
  async function confirmArrival(booking: Booking) {
    if (booking.status === "Confirmed") {
      if (!confirm(`Booking #${booking.booking_id} is already confirmed. Confirm again?`)) return;
    } else if (["Completed", "Cancelled", "Expired"].includes(booking.status)) {
      setError(`Booking is already ${booking.status.toLowerCase()} — it cannot be confirmed.`);
      return;
    }
    if (!confirm(`Confirm booking #${booking.booking_id}?`)) return;
    await updateBooking(booking.id, { status: "Confirmed" });
  }

  function editDraft(booking: Booking) {
    return editDrafts[booking.id] || {
      slot_date: dateKey(booking.slot_date),
      slot_time: booking.slot_time || "",
      // The editable amount is the pre-discount subtotal; the discount is applied on top of it.
      final_amount: String(bookingSubtotal(booking) || ""),
      discount_type: (booking.discount_type === "PERCENT" || booking.discount_type === "FLAT" ? booking.discount_type : "") as "" | "PERCENT" | "FLAT",
      discount_value: booking.discount_value ? String(booking.discount_value) : "",
      discount_reason: booking.discount_reason || "",
      client_name: booking.client?.name || "",
      client_phone: booking.client?.phone || "",
      client_email: booking.client?.email || "",
      address_line1: booking.address?.line1 || "",
      address_city: booking.address?.city || "",
      address_state: booking.address?.state || "Gujarat",
      address_pincode: booking.address?.pincode || "",
      address_phone: booking.address?.phone || booking.client?.phone || "",
    };
  }

  function setBookingEditDraft(booking: Booking, patch: Partial<BookingEditDraft>) {
    setEditDrafts((prev) => ({ ...prev, [booking.id]: { ...(prev[booking.id] || editDraft(booking)), ...patch } }));
  }

  async function saveBookingEdit(booking: Booking) {
    const draft = editDraft(booking);
    await updateBooking(booking.id, {
      slot_date: draft.slot_date,
      slot_time: draft.slot_time,
      final_amount: draft.final_amount === "" ? undefined : Number(draft.final_amount),
      // Always sent, so clearing the type removes an existing discount.
      discount_type: draft.discount_type || null,
      discount_value: draft.discount_type ? Number(draft.discount_value || 0) : 0,
      discount_reason: draft.discount_reason,
      client: {
        name: draft.client_name,
        phone: draft.client_phone,
        email: draft.client_email,
      },
      address: {
        line1: draft.address_line1,
        city: draft.address_city,
        state: draft.address_state,
        pincode: draft.address_pincode,
        phone: draft.address_phone,
      },
    });
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
    const amount = bookingAmount(booking).toLocaleString("en-IN");
    const detailUrl = detailsLink(booking) ? new URL(detailsLink(booking), window.location.origin).toString() : "";
    const message = kind === "cod"
      ? `Hello ${customer}, this is a reminder that COD amount is pending for booking #${booking.booking_id}. Please pay during service completion. Thank you.`
      : kind === "paid"
        ? `Hello ${customer}, your payment for booking #${booking.booking_id} has been completed successfully. Invoice has been generated. Thank you for choosing us.`
        : `Hello ${customer}, your booking #${booking.booking_id} for ${service} is confirmed. Total amount: ₹${amount}.${detailUrl ? ` Please complete booking details/KYC here: ${detailUrl}` : ""} Thank you for booking with us.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  const isSelectedToday = selectedCalendarDate === dateKey(new Date());
  const selectedDateBookingsCount = filtered.filter((booking) => dateKey(booking.slot_date) === selectedCalendarDate).length;
  const metrics = counts.metrics;
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
        <div className="flex flex-wrap gap-2">
          <Button asChild><a href="/admin/bookings/new?mode=existing"><UserCheck className="mr-2 h-4 w-4" />Book existing client</a></Button>
          <Button variant="outline" asChild><a href="/admin/bookings/new?mode=new"><UserPlus className="mr-2 h-4 w-4" />Add new client & book</a></Button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-muted-foreground text-ellipsis overflow-hidden whitespace-nowrap">{isSelectedToday ? "Service today" : `Service on ${new Date(selectedCalendarDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}</p>
            <p className="text-xl font-bold">{isSelectedToday ? metrics?.serviceToday ?? selectedDateBookingsCount : selectedDateBookingsCount}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-muted-foreground">Booked today</p>
            <p className="text-xl font-bold">{metrics?.bookedToday ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-muted-foreground">{metrics?.paidLabel || "Collected today"}</p>
            <p className="text-xl font-bold">Rs. {Number(metrics?.collectedToday || 0).toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div
          role="tablist"
          aria-label="Filter bookings by period"
          className="mb-4 grid w-full grid-cols-2 gap-1 rounded-xl border bg-muted/40 p-1 sm:grid-cols-5"
        >
          {PERIOD_TABS.map((tab) => {
            const selected = period === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setPeriod(tab.value)}
                className={`flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  selected
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span
                  className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                    selected ? "bg-foreground text-background" : "bg-muted-foreground/15 text-muted-foreground"
                  }`}
                >
                  {counts[tab.value]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
          <Button
            type="button"
            variant="outline"
            className="h-10 px-3"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="booking-filter-panel"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <span className="text-xs font-semibold text-muted-foreground">{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
        </div>
        <div
          id="booking-filter-panel"
          className={`${filtersOpen ? "grid" : "hidden"} gap-3 md:grid md:grid-cols-2 lg:grid-cols-[minmax(260px,1.8fr)_minmax(150px,1fr)_minmax(140px,1fr)_minmax(150px,1fr)_minmax(130px,1fr)_minmax(145px,1fr)_minmax(145px,1fr)_auto] md:items-end`}
        >
          <div className="relative min-w-[240px] flex-[2_1_320px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search booking ID, client, pet, phone or email" className="pl-9" />
          </div>
          <label className="min-w-[170px] flex-1 text-xs font-semibold">Client
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-white px-3 text-sm" aria-label="Client">
              <option value="">All clients</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name || client.phone || client.email || "Client"}</option>)}
            </select>
          </label>
          <label className="min-w-[140px] flex-1 text-xs font-semibold">Booking status
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-white px-3 text-sm">
              {STATUSES.map((item) => <option key={item} value={item}>{item === "All" ? "All statuses" : item}</option>)}
            </select>
          </label>
          <label className="min-w-[150px] flex-1 text-xs font-semibold">Payment status
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-white px-3 text-sm">
              {PAYMENT_STATUSES.map((item) => <option key={item} value={item}>{item === "All" ? "All payment statuses" : item}</option>)}
            </select>
          </label>
          <label className="min-w-[130px] flex-1 text-xs font-semibold">Service
            <select value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-white px-3 text-sm">
              {SERVICE_FILTERS.map((item) => <option key={item} value={item}>{item === "All" ? "All services" : item}</option>)}
            </select>
          </label>
          <label className="min-w-[150px] flex-1 text-xs font-semibold">Service date from
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
          </label>
          <label className="min-w-[150px] flex-1 text-xs font-semibold">Service date to
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
          </label>
          <Button variant="outline" className="h-11 w-full lg:w-auto" onClick={() => { fetchBookings(); setFiltersOpen(false); }}>Apply filters</Button>
        </div>
        <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button type="button" size="sm" variant={viewMode === "list" ? "default" : "outline"} onClick={() => setViewMode("list")}><List className="mr-1 h-3.5 w-3.5" /> List</Button>
            <Button type="button" size="sm" variant={viewMode === "calendar" ? "default" : "outline"} onClick={() => setViewMode("calendar")}><Grid2X2 className="mr-1 h-3.5 w-3.5" /> Calendar</Button>
          </div>
          <Input type="date" value={selectedCalendarDate} onChange={(e) => setSelectedCalendarDate(e.target.value)} className="h-9 w-full sm:w-44" />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="justify-center sm:justify-start"
            onClick={() => {
              setQuery("");
              setClientId("");
              setStatus("All");
              setPaymentStatus("All");
              setServiceCategory("All");
              setDateFrom("");
              setDateTo("");
              setPeriod("all");
            }}
          >
            Clear all filters
          </Button>
        </div>
        <div className="mt-3 hidden flex-wrap items-center gap-2 text-xs md:flex">
          <span className="font-semibold text-muted-foreground">{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
          {clientId && <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">Client selected</span>}
          {status !== "All" && <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">Status: {status}</span>}
          {paymentStatus !== "All" && <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">Payment: {paymentStatus}</span>}
          {serviceCategory !== "All" && <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">Service: {serviceCategory}</span>}
          {dateFrom && <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">From: {dateFrom}</span>}
          {dateTo && <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">To: {dateTo}</span>}
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
            <h2 className="font-bold flex items-center justify-between"><span>{new Date(selectedCalendarDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span><span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{selectedDateBookings.length} {selectedDateBookings.length === 1 ? "booking" : "bookings"}</span></h2>
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
            {filtered.map((booking) => {
              const isExpanded = expandedBookingId === booking.id;
              const draft = editDraft(booking);
              return (
                <div key={booking.id} className="rounded-lg border bg-white shadow-sm overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 select-none"
                    onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{booking.booking_id}</p>
                      <p className="mt-1 truncate text-sm font-semibold">{booking.client?.name || "Customer"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{booking.service?.category} - {booking.pet?.name || "Pet"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeClass(booking.status)}`}>{booking.status}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t bg-muted/5 p-4 space-y-3 text-xs text-muted-foreground">
                      <div className="space-y-1 text-foreground">
                        <p><span className="font-semibold text-muted-foreground">Email:</span> {booking.client?.email || "-"}</p>
                        <p><span className="font-semibold text-muted-foreground">Phone:</span> {booking.client?.phone || "-"}</p>
                        <p><span className="font-semibold text-muted-foreground">Pet details:</span> {booking.pet?.name} ({booking.pet?.breed || booking.pet?.type})</p>
                        <p><span className="font-semibold text-muted-foreground">Service:</span> {booking.service?.name}</p>
                        {booking.addons_json?.coupon?.code && <p className="text-green-700 font-semibold">{booking.addons_json.coupon.code} Applied</p>}
                      </div>
                      <hr />
                      <p className="flex items-center gap-1 text-foreground"><Calendar className="h-3.5 w-3.5 text-primary" /> {formatDate(booking.slot_date)} at {booking.slot_time}</p>
                      <p className="text-xs text-muted-foreground">Booked on {formatDateTime(booking.created_at)}</p>
                      <p className="flex items-start gap-1"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {booking.address ? `${booking.address.line1}, ${booking.address.city}, ${booking.address.pincode || ""}` : "-"}</p>
                      {booking.notes && <p className="bg-amber-50 text-amber-800 p-2 rounded border border-amber-200"><strong>Notes:</strong> {booking.notes}</p>}
                      <hr />
                      <p>{paymentSummary(booking)}</p>
                      <p className="font-bold text-foreground">{money(bookingAmount(booking))} - {booking.payment_status}</p>
                      {paymentHistory(booking)}
                      {booking.documents?.length ? (
                        <div className="mt-2 space-y-1">
                          <p className="font-semibold text-foreground">Linked Documents:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {booking.documents.map((doc) => (
                              <span key={doc.id} className="inline-flex items-center gap-1 rounded-lg border bg-white px-2 py-1 text-[11px] font-semibold text-foreground">
                                {doc.document_type || doc.original_name}
                                <button type="button" onClick={() => setViewer({ label: doc.document_type || doc.original_name, path: doc.path })}><Eye className="h-3.5 w-3.5" /></button>
                                <a href={doc.path} download><Download className="h-3.5 w-3.5" /></a>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <hr />
                      <div className="rounded-lg border bg-white p-3 text-foreground">
                        <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          <Edit3 className="h-3 w-3" /> Edit booking
                        </p>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Input type="date" value={draft.slot_date} onChange={(e) => setBookingEditDraft(booking, { slot_date: e.target.value })} className="h-9 text-xs" />
                          <Input value={draft.slot_time} onChange={(e) => setBookingEditDraft(booking, { slot_time: e.target.value })} placeholder="Time" className="h-9 text-xs" />
                          <Input type="number" value={draft.final_amount} onChange={(e) => setBookingEditDraft(booking, { final_amount: e.target.value })} placeholder="Amount" className="h-9 text-xs" />
                        </div>
                        <DiscountEditor draft={draft} booking={booking} onChange={(patch) => setBookingEditDraft(booking, patch)} />
                        <ExtendPanel
                          booking={booking}
                          busy={savingId === booking.id}
                          onExtend={(date, time, note) => extendBooking(booking.id, date, time, note)}
                          onDecide={(action) => decideExtension(booking.id, action)}
                        />
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          <Input value={draft.client_name} onChange={(e) => setBookingEditDraft(booking, { client_name: e.target.value })} placeholder="Client name" className="h-9 text-xs" />
                          <Input value={draft.client_phone} onChange={(e) => setBookingEditDraft(booking, { client_phone: e.target.value.replace(/[^\d+]/g, "").slice(0, 14) })} placeholder="Client phone" className="h-9 text-xs" />
                          <Input value={draft.client_email} onChange={(e) => setBookingEditDraft(booking, { client_email: e.target.value })} placeholder="Client email" className="h-9 text-xs" />
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <Input value={draft.address_line1} onChange={(e) => setBookingEditDraft(booking, { address_line1: e.target.value })} placeholder="Address" className="h-9 text-xs" />
                          <Input value={draft.address_city} onChange={(e) => setBookingEditDraft(booking, { address_city: e.target.value })} placeholder="City" className="h-9 text-xs" />
                          <Input value={draft.address_state} onChange={(e) => setBookingEditDraft(booking, { address_state: e.target.value })} placeholder="State" className="h-9 text-xs" />
                          <Input value={draft.address_pincode} onChange={(e) => setBookingEditDraft(booking, { address_pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="Pincode" className="h-9 text-xs" />
                          <Input value={draft.address_phone} onChange={(e) => setBookingEditDraft(booking, { address_phone: e.target.value.replace(/[^\d+]/g, "").slice(0, 14) })} placeholder="Address phone" className="h-9 text-xs sm:col-span-2" />
                        </div>
                        <Button size="sm" variant="outline" className="mt-2" disabled={savingId === booking.id} onClick={() => saveBookingEdit(booking)}>
                          <Save className="mr-1 h-3.5 w-3.5" /> Save edit
                        </Button>
                      </div>
                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="font-semibold text-foreground text-[10px] block mb-1">Update Status</label>
                          <select
                            value={booking.status}
                            disabled={savingId === booking.id}
                            onChange={(e) => updateBooking(booking.id, { status: e.target.value })}
                            className="block h-9 w-full rounded-lg border bg-white px-2 text-xs text-foreground"
                          >
                            {STATUSES.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="font-semibold text-foreground text-[10px] block mb-1">Update Payment</label>
                          <select
                            value={booking.payment_status}
                            disabled={savingId === booking.id}
                            onChange={(e) => updateBooking(booking.id, { payment_status: e.target.value, payment_method: "Admin" })}
                            className="block h-9 w-full rounded-lg border bg-white px-2 text-xs text-foreground"
                          >
                            {PAYMENT_STATUSES.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="font-semibold text-foreground text-[10px] block mb-1">Internal Note</label>
                          <textarea
                            defaultValue={booking.internal_notes || ""}
                            onBlur={(e) => updateBooking(booking.id, { internal_notes: e.target.value })}
                            placeholder="Add private note"
                            className="h-14 w-full resize-none rounded-lg border bg-white p-2 text-xs text-foreground outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => confirmArrival(booking)}>
                          {booking.status === "Confirmed" ? "Confirmed" : "Confirm Booking"}
                        </Button>
                        <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => updateBooking(booking.id, { payment_status: "Paid", payment_method: "Admin" })}>Paid</Button>
                        {(booking.payment_status === "Advance Paid" || booking.payment_status === "Partially Paid") && (
                          <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => collectCodPayment(booking.id)}>COD</Button>
                        )}
                        <Button size="sm" variant="outline" asChild>
                          <a href={whatsappLink(booking, booking.payment_status === "Paid" ? "paid" : booking.payment_status === "Partially Paid" ? "cod" : "confirmation")} target="_blank" rel="noreferrer">
                            <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                          </a>
                        </Button>
                        {detailsLink(booking) && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={detailsLink(booking)} target="_blank" rel="noreferrer">Details/KYC</a>
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" disabled={savingId === booking.id} onClick={() => deleteBooking(booking.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1000px] table-fixed text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-[50px] px-4 py-3 text-center"></th>
                  <th className="w-[170px] px-4 py-3">Booking ID</th>
                  <th className="w-[120px] px-4 py-3">Category</th>
                  <th className="w-[200px] px-4 py-3">Client & Pet</th>
                  <th className="w-[220px] px-4 py-3">Schedule</th>
                  <th className="w-[130px] px-4 py-3">Status</th>
                  <th className="w-[130px] px-4 py-3">Payment</th>
                  <th className="w-[120px] px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((booking) => {
                  const isExpanded = expandedBookingId === booking.id;
                  const draft = editDraft(booking);
                  return (
                    <Fragment key={booking.id}>
                      <tr
                        className={`align-middle hover:bg-muted/30 cursor-pointer transition-colors ${isExpanded ? "bg-muted/20" : ""}`}
                        onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                      >
                        <td className="px-4 py-4 text-center">
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </td>
                        <td className="px-4 py-4 font-bold text-foreground">
                          {booking.booking_id}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-bold ${serviceColor(booking.service?.category)}`}>
                            {booking.service?.category || "Service"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-foreground">{booking.client?.name || "Customer"}</p>
                          <p className="text-xs text-muted-foreground">Pet: {booking.pet?.name || "-"}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="flex items-center gap-1 text-xs font-semibold text-foreground"><Calendar className="h-3.5 w-3.5 text-primary" /> {formatDate(booking.slot_date)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{booking.slot_time}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeClass(booking.status)}`}>{booking.status}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeClass(booking.payment_status)}`}>{booking.payment_status}</span>
                        </td>
                        <td className="px-4 py-4 font-bold text-foreground">
                          {money(bookingAmount(booking))}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/5">
                          <td colSpan={8} className="px-6 py-4 border-t border-b">
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                              {/* Column 1: Client & Service Details */}
                              <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client & Service Info</h3>
                                <div className="rounded-lg border bg-white p-3 space-y-2 text-xs">
                                  <p><span className="font-semibold text-muted-foreground">Client:</span> {booking.client?.name || "Customer"}</p>
                                  <p className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> {booking.client?.email || "-"}</p>
                                  <p className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> {booking.client?.phone || "-"}</p>
                                  <hr className="my-1" />
                                  <p><span className="font-semibold text-muted-foreground">Pet:</span> {booking.pet?.name || "-"} ({booking.pet?.breed || booking.pet?.type || "-"})</p>
                                  <p><span className="font-semibold text-muted-foreground">Service:</span> {booking.service?.name}</p>
                                  {booking.addons_json?.coupon?.code && (
                                    <p className="text-green-700 font-semibold">{booking.addons_json.coupon.code} Coupon Applied</p>
                                  )}
                                  {booking.notes && (
                                    <p className="bg-amber-50 text-amber-800 p-2 rounded border border-amber-200 mt-2">
                                      <span className="font-bold block">Customer Notes:</span> {booking.notes}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Column 2: Schedule & Address */}
                              <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Schedule & Address</h3>
                                <div className="rounded-lg border bg-white p-3 space-y-2 text-xs">
                                  <p><span className="font-semibold text-muted-foreground">Date:</span> {formatDate(booking.slot_date)}</p>
                                  <p><span className="font-semibold text-muted-foreground">Time Slot:</span> {booking.slot_time}</p>
                                  <p><span className="font-semibold text-muted-foreground">Booked On:</span> {formatDateTime(booking.created_at)}</p>
                                  <p className="flex items-start gap-1">
                                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                    <span>{booking.address ? `${booking.address.line1}, ${booking.address.city}, ${booking.address.pincode || ""}` : "No address specified"}</span>
                                  </p>
                                  {booking.documents?.length ? (
                                    <div className="mt-2">
                                      <span className="font-semibold text-muted-foreground block mb-1">Documents:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {booking.documents.map((doc) => (
                                          <span key={doc.id} className="inline-flex items-center gap-1 rounded-lg border bg-muted/30 px-2 py-1 text-[11px] font-semibold text-foreground">
                                            {doc.document_type || doc.original_name}
                                            <button type="button" onClick={(e) => { e.stopPropagation(); setViewer({ label: doc.document_type || doc.original_name, path: doc.path }); }}><Eye className="h-3 w-3" /></button>
                                            <a href={doc.path} download onClick={(e) => e.stopPropagation()}><Download className="h-3 w-3" /></a>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); shareDocument(doc.path); }}><Share2 className="h-3 w-3" /></button>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); printDocument(doc.path); }}><Printer className="h-3 w-3" /></button>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              {/* Column 3: Edit Status & Notes */}
                              <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Management & Actions</h3>
                                <div className="rounded-lg border bg-white p-3 space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
                                  <div className="rounded-lg border bg-muted/20 p-2">
                                    <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                      <Edit3 className="h-3 w-3" /> Edit booking
                                    </p>
                                    <div className="grid gap-2">
                                      <Input type="date" value={draft.slot_date} onChange={(e) => setBookingEditDraft(booking, { slot_date: e.target.value })} className="h-9 text-xs" />
                                      <Input value={draft.slot_time} onChange={(e) => setBookingEditDraft(booking, { slot_time: e.target.value })} placeholder="Time" className="h-9 text-xs" />
                                      <Input type="number" value={draft.final_amount} onChange={(e) => setBookingEditDraft(booking, { final_amount: e.target.value })} placeholder="Amount" className="h-9 text-xs" />
                                    </div>
                                    <DiscountEditor draft={draft} booking={booking} onChange={(patch) => setBookingEditDraft(booking, patch)} />
                                    <ExtendPanel
                                      booking={booking}
                                      busy={savingId === booking.id}
                                      onExtend={(date, time, note) => extendBooking(booking.id, date, time, note)}
                                      onDecide={(action) => decideExtension(booking.id, action)}
                                    />
                                    <div className="mt-2 grid gap-2">
                                      <Input value={draft.client_name} onChange={(e) => setBookingEditDraft(booking, { client_name: e.target.value })} placeholder="Client name" className="h-9 text-xs" />
                                      <Input value={draft.client_phone} onChange={(e) => setBookingEditDraft(booking, { client_phone: e.target.value.replace(/[^\d+]/g, "").slice(0, 14) })} placeholder="Client phone" className="h-9 text-xs" />
                                      <Input value={draft.client_email} onChange={(e) => setBookingEditDraft(booking, { client_email: e.target.value })} placeholder="Client email" className="h-9 text-xs" />
                                      <Input value={draft.address_line1} onChange={(e) => setBookingEditDraft(booking, { address_line1: e.target.value })} placeholder="Address" className="h-9 text-xs" />
                                      <div className="grid grid-cols-2 gap-2">
                                        <Input value={draft.address_city} onChange={(e) => setBookingEditDraft(booking, { address_city: e.target.value })} placeholder="City" className="h-9 text-xs" />
                                        <Input value={draft.address_state} onChange={(e) => setBookingEditDraft(booking, { address_state: e.target.value })} placeholder="State" className="h-9 text-xs" />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <Input value={draft.address_pincode} onChange={(e) => setBookingEditDraft(booking, { address_pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="Pincode" className="h-9 text-xs" />
                                        <Input value={draft.address_phone} onChange={(e) => setBookingEditDraft(booking, { address_phone: e.target.value.replace(/[^\d+]/g, "").slice(0, 14) })} placeholder="Address phone" className="h-9 text-xs" />
                                      </div>
                                    </div>
                                    <Button size="sm" variant="outline" className="mt-2 w-full" disabled={savingId === booking.id} onClick={() => saveBookingEdit(booking)}>
                                      <Save className="mr-1 h-3.5 w-3.5" /> Save edit
                                    </Button>
                                  </div>
                                  <div>
                                    <label className="font-semibold text-muted-foreground text-[10px] block">Booking Status</label>
                                    <select
                                      value={booking.status}
                                      disabled={savingId === booking.id}
                                      onChange={(e) => updateBooking(booking.id, { status: e.target.value })}
                                      className="mt-1 block h-9 w-full rounded-lg border bg-white px-2 text-xs"
                                    >
                                      {STATUSES.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="font-semibold text-muted-foreground text-[10px] block">Payment Status</label>
                                    <p className="mt-1 text-[10px] text-muted-foreground">{paymentSummary(booking)}</p>
                                    {paymentHistory(booking)}
                                    <select
                                      value={booking.payment_status}
                                      disabled={savingId === booking.id}
                                      onChange={(e) => updateBooking(booking.id, { payment_status: e.target.value, payment_method: "Admin" })}
                                      className="mt-1 block h-9 w-full rounded-lg border bg-white px-2 text-xs"
                                    >
                                      {PAYMENT_STATUSES.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="font-semibold text-muted-foreground text-[10px] block">Private Internal Notes</label>
                                    <textarea
                                      defaultValue={booking.internal_notes || ""}
                                      onBlur={(e) => updateBooking(booking.id, { internal_notes: e.target.value })}
                                      placeholder="Add private note"
                                      className="mt-1 h-14 w-full resize-none rounded-lg border bg-white p-2 text-xs outline-none focus:border-primary"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Full-width Actions Row */}
                            <div className="mt-4 flex flex-wrap items-center justify-between border-t pt-3 gap-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => confirmArrival(booking)}>
                                  <UserCheck className="mr-1 h-3.5 w-3.5" /> {booking.status === "Confirmed" ? "Confirmed" : "Confirm Booking"}
                                </Button>
                                <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => updateBooking(booking.id, { payment_status: "Paid", payment_method: "Admin" })}>
                                  <CreditCard className="mr-1 h-3.5 w-3.5" /> Paid
                                </Button>
                                {(booking.payment_status === "Advance Paid" || booking.payment_status === "Partially Paid") && (
                                  <Button size="sm" variant="outline" disabled={savingId === booking.id} onClick={() => collectCodPayment(booking.id)}>
                                    Collect COD
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" asChild>
                                  <a href={whatsappLink(booking, booking.payment_status === "Paid" ? "paid" : booking.payment_status === "Partially Paid" ? "cod" : "confirmation")} target="_blank" rel="noreferrer">
                                    <MessageCircle className="mr-1 h-3.5 w-3.5 text-green-600" /> WhatsApp
                                  </a>
                                </Button>
                                {detailsLink(booking) && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={detailsLink(booking)} target="_blank" rel="noreferrer">Details/KYC</a>
                                  </Button>
                                )}
                              </div>
                              <Button size="sm" variant="destructive" disabled={savingId === booking.id} onClick={() => deleteBooking(booking.id)}>
                                {savingId === booking.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
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
