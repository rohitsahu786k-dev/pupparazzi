import Link from "next/link";
import { getServerSession } from "next-auth";
import { Calendar, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export default async function StaffDashboard() {
  const session = await getServerSession(authOptions);
  const today = new Date();
  const assignedWhere = session?.user?.role === "STAFF" ? { OR: [{ staff_id: session.user.id }, { staff_id: null }] } : {};

  const [todayBookings, confirmed, inProgress, completedToday, upcoming] = await Promise.all([
    prisma.booking.count({ where: { ...assignedWhere, slot_date: { gte: startOfDay(today), lte: endOfDay(today) }, status: { notIn: ["Cancelled", "Expired"] } } }),
    prisma.booking.count({ where: { ...assignedWhere, status: "Confirmed" } }),
    prisma.booking.count({ where: { ...assignedWhere, status: "In Progress" } }),
    prisma.booking.count({ where: { ...assignedWhere, slot_date: { gte: startOfDay(today), lte: endOfDay(today) }, status: "Completed" } }),
    prisma.booking.findMany({
      where: { ...assignedWhere, slot_date: { gte: startOfDay(today) }, status: { in: ["Confirmed", "In Progress"] } },
      include: { client: true, pet: true, service: true },
      orderBy: [{ slot_date: "asc" }, { created_at: "desc" }],
      take: 8,
    }),
  ]);

  const stats = [
    { title: "Service Today", value: todayBookings, icon: Calendar },
    { title: "Confirmed", value: confirmed, icon: Clock },
    { title: "In Progress", value: inProgress, icon: PlayCircle },
    { title: "Completed Today", value: completedToday, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Staff Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Operational view for bookings, schedules, and service status updates.</p>
        </div>
        <Button asChild><Link href="/staff/bookings">Open Bookings</Link></Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-border/70 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value.toLocaleString("en-IN")}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Upcoming Assigned Work</CardTitle></CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="rounded-lg border bg-muted/35 p-8 text-center text-sm text-muted-foreground">No upcoming active bookings.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Pet</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {upcoming.map((booking) => (
                    <tr key={booking.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-bold">{booking.booking_id}</td>
                      <td className="px-4 py-3">{booking.client?.name || "Customer"}<br /><span className="text-xs text-muted-foreground">{booking.client?.phone || "-"}</span></td>
                      <td className="px-4 py-3">{booking.pet?.name || "Pet"}</td>
                      <td className="px-4 py-3">{booking.service?.name || "-"}</td>
                      <td className="px-4 py-3">{booking.slot_date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - {booking.slot_time}</td>
                      <td className="px-4 py-3"><span className="rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700">{booking.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
