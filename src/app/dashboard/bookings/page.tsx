"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2, Plus } from "lucide-react";

type Booking = {
  id: string;
  booking_id: string;
  status: string;
  payment_status: string;
  slot_date: string;
  slot_time: string;
  service?: { name?: string; category?: string } | null;
  pet?: { name?: string } | null;
};

export default function DashboardBookingsPage() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All your past and upcoming bookings.
          </p>
        </div>
        <Button asChild>
          <Link href="/book"><Plus className="mr-2 h-4 w-4" /> New Booking</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center">
          <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
          <Button asChild className="mt-4">
            <Link href="/book">Book a Service</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
              <div>
                <p className="font-bold text-sm">{b.service?.name || "Service"}</p>
                <p className="text-xs text-muted-foreground">
                  {b.pet?.name} · {new Date(b.slot_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {b.slot_time}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{b.booking_id}</p>
              </div>
              <div className="text-right">
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                  b.status === "Confirmed" ? "bg-green-50 text-green-700" :
                  b.status === "Pending" ? "bg-yellow-50 text-yellow-700" :
                  b.status === "Completed" ? "bg-blue-50 text-blue-700" :
                  b.status === "Cancelled" || b.status === "Expired" ? "bg-red-50 text-red-700" :
                  "bg-gray-100 text-gray-600"
                }`}>{b.status}</span>
                <p className="mt-1 text-xs text-muted-foreground">{b.payment_status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
