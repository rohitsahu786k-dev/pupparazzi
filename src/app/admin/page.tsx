import Link from "next/link";
import { Calendar, DollarSign, PawPrint, Scissors, TicketPercent, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

export default async function AdminDashboard() {
  const today = new Date();
  const [todayBookings, activeClients, pets, activeServices, paidPayments, upcomingBookings, couponSetting] = await Promise.all([
    prisma.booking.count({ where: { slot_date: { gte: startOfDay(today), lte: endOfDay(today) }, status: { not: "Cancelled" } } }),
    prisma.user.count({ where: { role: "CLIENT", is_active: true } }),
    prisma.pet.count(),
    prisma.service.count({ where: { is_active: true } }),
    prisma.payment.findMany({ where: { status: "Success", created_at: { gte: startOfDay(today), lte: endOfDay(today) } }, select: { amount: true } }),
    prisma.booking.findMany({
      where: { slot_date: { gte: startOfDay(today) }, status: { in: ["Pending", "Confirmed", "In Progress"] } },
      include: { client: true, pet: true, service: true },
      orderBy: [{ slot_date: "asc" }, { created_at: "desc" }],
      take: 8,
    }),
    prisma.appSetting.findUnique({ where: { key: "coupons" } }),
  ]);

  const revenueToday = paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const activeCoupons = Array.isArray(couponSetting?.value) ? couponSetting.value.filter((coupon: any) => coupon.is_active).length : 0;

  const stats = [
    { title: "Bookings Today", value: String(todayBookings), icon: Calendar, href: "/admin/bookings" },
    { title: "Revenue Today", value: money(revenueToday), icon: DollarSign, href: "/admin/payments" },
    { title: "Active Clients", value: String(activeClients), icon: Users, href: "/admin/clients" },
    { title: "Registered Pets", value: String(pets), icon: PawPrint, href: "/admin/pets" },
    { title: "Active Services", value: String(activeServices), icon: Scissors, href: "/admin/services" },
    { title: "Active Coupons", value: String(activeCoupons), icon: TicketPercent, href: "/admin/coupons" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live business snapshot for bookings, customers, pets, services, payments, and offers.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/admin/services">Manage Services</Link></Button>
          <Button asChild><Link href="/admin/bookings">Review Bookings</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="border-border/70 shadow-sm transition hover:border-primary/40">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Upcoming Active Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <div className="rounded-lg border bg-muted/35 p-8 text-center text-sm text-muted-foreground">No upcoming bookings.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-175 text-left text-sm">
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
                  {upcomingBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-bold">{booking.booking_id}</td>
                      <td className="px-4 py-3">{booking.client?.name || "Customer"}<br /><span className="text-xs text-muted-foreground">{booking.client?.phone || booking.client?.email || "-"}</span></td>
                      <td className="px-4 py-3">{booking.pet?.name || "Pet"}</td>
                      <td className="px-4 py-3">{booking.service?.name || "-"}</td>
                      <td className="px-4 py-3">{booking.slot_date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · {booking.slot_time}</td>
                      <td className="px-4 py-3"><span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{booking.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button variant="link" asChild><Link href="/admin/bookings">View all bookings</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
