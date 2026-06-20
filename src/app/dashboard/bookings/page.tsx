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
  details_completed?: boolean;
  slot_date: string;
  slot_time: string;
  service?: { name?: string; category?: string } | null;
  pet?: { name?: string } | null;
};

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

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
