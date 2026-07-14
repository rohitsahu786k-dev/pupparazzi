"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, CalendarPlus, Loader2, Plus } from "lucide-react";
import { canExtendBooking, quoteExtension } from "@/lib/booking-extension";

type Booking = {
  id: string;
  booking_id: string;
  status: string;
  payment_status: string;
  details_completed?: boolean;
  slot_date: string;
  slot_time: string;
  service?: { name?: string; category?: string; price?: number | null; discounted_price?: number | null; service_group?: string | null } | null;
  pet?: { name?: string } | null;
  addons_json?: unknown;
  final_amount?: number | null;
  discount_type?: string | null;
  discount_value?: number | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  extension_status?: string | null;
  extension_check_out_date?: string | null;
  extension_check_out_time?: string | null;
  extension_extra_amount?: number | null;
};

function money(value: unknown) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function dateKey(value: string | Date) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Clients ask for a longer stay here; nothing changes on the booking until an
 * admin approves. The price shown is produced by the same quoteExtension the
 * server uses, so the customer never sees a figure the server would disagree with.
 */
function ExtendRequest({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [checkOutDate, setCheckOutDate] = useState(() => (booking.check_out_date ? dateKey(booking.check_out_date) : ""));
  const [checkOutTime, setCheckOutTime] = useState(booking.check_out_time || "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!canExtendBooking(booking as any)) return null;

  if (booking.extension_status === "Requested") {
    return (
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
        <p className="font-bold">Extension requested</p>
        <p className="mt-0.5">
          Awaiting approval for {booking.extension_check_out_date ? new Date(booking.extension_check_out_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "-"} {booking.extension_check_out_time || ""}
          {booking.extension_extra_amount ? ` · Extra ${money(booking.extension_extra_amount)}` : ""}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <Button className="mt-3 w-full" variant="outline" onClick={() => setOpen(true)}>
        <CalendarPlus className="mr-2 h-4 w-4" /> Extend stay
      </Button>
    );
  }

  const quote = quoteExtension(booking as any, checkOutDate || null, checkOutTime || null);

  async function submit() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/bookings/extend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: booking.id, check_out_date: checkOutDate, check_out_time: checkOutTime, note }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.message || "Unable to request an extension");
      return;
    }
    setOpen(false);
    onDone();
  }

  return (
    <div className="mt-3 rounded-lg border bg-muted/20 p-2">
      <p className="mb-2 text-xs font-bold">Request a longer stay</p>
      <div className="grid gap-2">
        <Input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="h-9 text-xs" aria-label="New check-out date" />
        <Input value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} placeholder="New check-out time" className="h-9 text-xs" aria-label="New check-out time" />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-9 text-xs" aria-label="Note" />
      </div>

      {quote.ok ? (
        <div className="mt-2 space-y-0.5 text-[11px]">
          <div className="flex justify-between text-muted-foreground"><span>Additional charge</span><span>+ {money(quote.extraAmount)}</span></div>
          <div className="flex justify-between font-bold"><span>New total</span><span>{money(quote.newTotal)}</span></div>
        </div>
      ) : (
        quote.error && <p className="mt-1 text-[11px] font-medium text-red-600">{quote.error}</p>
      )}
      {error && <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>}
      <p className="mt-1 text-[11px] text-muted-foreground">Subject to availability. Our team will confirm your request.</p>

      <div className="mt-2 flex gap-2">
        <Button size="sm" className="flex-1" disabled={saving || !quote.ok} onClick={submit}>
          {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null} Send request
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "Confirmed") return "bg-green-50 text-green-700";
  if (status === "Pending") return "bg-yellow-50 text-yellow-700";
  if (status === "Completed") return "bg-blue-50 text-blue-700";
  if (status === "Cancelled" || status === "Expired") return "bg-red-50 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function detailsLink(booking: Booking) {
  const category = booking.service?.category?.toLowerCase();
  if (category !== "boarding" && category !== "grooming") return "";
  return `/dashboard/bookings/${booking.id}/details?service=${category}`;
}

export default function DashboardBookingsPage() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  function loadBookings() {
    return fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!session?.user?.id) return;
    loadBookings();
  }, [session?.user?.id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">All your past and upcoming bookings.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/book"><Plus className="mr-2 h-4 w-4" /> New Booking</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center sm:p-10">
          <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
          <Button asChild className="mt-4 w-full sm:w-auto">
            <Link href="/book">Book a Service</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{booking.service?.name || "Service"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {booking.pet?.name || "Pet"} - {new Date(booking.slot_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} - {booking.slot_time}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{booking.booking_id}</p>
                </div>
                <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${statusClass(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
              <p className="mt-3 inline-flex rounded-lg bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                {booking.payment_status}
              </p>
              {detailsLink(booking) ? (
                booking.details_completed ? (
                  <Button className="mt-3 w-full" variant="outline" disabled>Details submitted</Button>
                ) : (
                  <Button asChild className="mt-3 w-full" variant="outline">
                    <Link href={detailsLink(booking)}>Details/KYC</Link>
                  </Button>
                )
              ) : null}
              <ExtendRequest booking={booking} onDone={loadBookings} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
