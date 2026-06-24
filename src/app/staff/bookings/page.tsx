"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Loader2, Search, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Booking = {
  id: string;
  booking_id: string;
  status: string;
  slot_date: string;
  slot_time: string;
  internal_notes?: string | null;
  client?: { name?: string | null; phone?: string | null };
  pet?: { name?: string | null; type?: string | null; breed?: string | null };
  service?: { name?: string | null; category?: string | null };
};

const STATUSES = ["All", "Confirmed", "In Progress", "Completed", "Pending"];
const UPDATE_STATUSES = ["Confirmed", "In Progress", "Completed"];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function badgeClass(value: string) {
  if (value === "Completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "Confirmed" || value === "In Progress") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function StaffBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [savingId, setSavingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function fetchBookings() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (status !== "All") params.set("status", status);
    const res = await fetch(`/api/bookings?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } else {
      setError("Unable to load bookings.");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchBookings();
  }, [status]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return bookings;
    return bookings.filter((booking) => [
      booking.booking_id,
      booking.client?.name,
      booking.client?.phone,
      booking.pet?.name,
      booking.service?.name,
      booking.service?.category,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)));
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
      setError(data.message || "Unable to update booking.");
    }
    await fetchBookings();
    setSavingId("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update service progress and internal handoff notes.</p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search booking, client, pet, service..." className="pl-9" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <Button variant="outline" onClick={fetchBookings}>Refresh</Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((booking) => (
            <div key={booking.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-foreground">{booking.booking_id}</p>
                    <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeClass(booking.status)}`}>{booking.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{booking.client?.name || "Customer"} - {booking.client?.phone || "-"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{booking.pet?.name || "Pet"} ({booking.pet?.breed || booking.pet?.type || "-"}) - {booking.service?.name || "Service"}</p>
                  <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-foreground"><Calendar className="h-4 w-4 text-primary" /> {formatDate(booking.slot_date)} at {booking.slot_time}</p>
                </div>
                <div className="grid w-full gap-2 lg:w-80">
                  <select
                    value={UPDATE_STATUSES.includes(booking.status) ? booking.status : "Confirmed"}
                    disabled={savingId === booking.id}
                    onChange={(e) => updateBooking(booking.id, { status: e.target.value })}
                    className="h-10 rounded-lg border bg-white px-3 text-sm"
                  >
                    {UPDATE_STATUSES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <textarea
                    value={notes[booking.id] ?? booking.internal_notes ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                    placeholder="Internal note"
                    className="h-20 resize-none rounded-lg border bg-white p-3 text-sm outline-none focus:border-primary"
                  />
                  <Button variant="outline" disabled={savingId === booking.id} onClick={() => updateBooking(booking.id, { internal_notes: notes[booking.id] ?? booking.internal_notes ?? "" })}>
                    {savingId === booking.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save note
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!filtered.length && <div className="rounded-lg border bg-white p-10 text-center text-sm text-muted-foreground">No bookings match these filters.</div>}
        </div>
      )}
    </div>
  );
}
