"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, DollarSign, PawPrint, TrendingUp } from "lucide-react";
import Link from "next/link";

const KPI_STATS = [
  { title: "Total Bookings Today", value: "12", icon: Calendar, trend: "+2 from yesterday" },
  { title: "Revenue Today", value: "₹14,500", icon: DollarSign, trend: "+15% from yesterday" },
  { title: "Active Clients", value: "342", icon: Users, trend: "+4 this week" },
  { title: "Pets Registered", value: "415", icon: PawPrint, trend: "+7 this week" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Here is what&apos;s happening across PetCare Pro today.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/reports">Generate Report</Link>
          </Button>
          <Button asChild className="shadow-warm">
            <Link href="/admin/bookings/new">+ New Booking</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPI_STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="shadow-sm border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Upcoming Bookings (Live)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[1, 2, 3].map((row) => (
                    <tr key={row} className="hover:bg-muted/50">
                      <td className="px-4 py-3">10:00 AM</td>
                      <td className="px-4 py-3">Rahul Sharma<br/><span className="text-xs text-muted-foreground">Max (Dog)</span></td>
                      <td className="px-4 py-3">Premium Grooming</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
               <Button variant="link" asChild><Link href="/admin/bookings">View all bookings</Link></Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               {[
                 { action: "New client registered", time: "10 mins ago" },
                 { action: "Payment of ₹1499 received", time: "1 hour ago" },
                 { action: "Booking cancelled by user", time: "2 hours ago" },
                 { action: "Low stock alert: Pet Shampoo", time: "5 hours ago", alert: true }
               ].map((item, i) => (
                 <div key={i} className="flex gap-3 items-start">
                   <div className={`w-2 h-2 rounded-full mt-1.5 ${item.alert ? 'bg-red-500' : 'bg-primary'}`} />
                   <div>
                     <p className="text-sm font-medium">{item.action}</p>
                     <p className="text-xs text-muted-foreground">{item.time}</p>
                   </div>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
