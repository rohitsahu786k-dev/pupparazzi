"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, CreditCard, PawPrint } from "lucide-react";

export default function DashboardOverview() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Pet Parent";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Hello {userName}</h1>
          <p className="text-secondary mt-1">Welcome back to your PetCare Pro dashboard.</p>
        </div>
        <Button asChild className="rounded-full shadow-warm bg-primary text-white hover:bg-primary/90 font-bold">
          <Link href="/book">Quick Book</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upcoming Bookings Widget */}
        <Card className="md:col-span-2 shadow-sm border-none bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Upcoming Bookings</CardTitle>
            <CardDescription>Your next scheduled sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-xl border-border/50 bg-background/50">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <PawPrint className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No upcoming bookings</p>
              <Button variant="link" asChild className="mt-2"><Link href="/book">Schedule a session</Link></Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats / Wallet Widget */}
        <div className="space-y-6">
          <Card className="shadow-sm border-none bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium"><CreditCard className="h-5 w-5" /> Wallet Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">₹0.00</div>
              <p className="text-primary-foreground/80 text-sm mt-2">Add money for quicker checkouts.</p>
              <Button variant="secondary" size="sm" className="mt-4 w-full bg-background text-foreground hover:bg-background/90" asChild>
                <Link href="/dashboard/wallet">Top Up Wallet</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-none bg-secondary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-foreground">Complete Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-secondary mb-4">Complete your pet&apos;s health profile for better care</p>
              <Button variant="outline" size="sm" className="w-full bg-background font-bold text-foreground" asChild>
                <Link href="/dashboard/pets">Add Pet Info</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
