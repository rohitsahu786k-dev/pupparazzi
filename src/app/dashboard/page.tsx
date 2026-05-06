"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, CreditCard, PawPrint, Loader2, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const justBooked = searchParams?.get("booked") === "true";
  const userId = (session?.user as any)?.id;
  const userName = session?.user?.name || "Pet Parent";
  const [bookings, setBookings] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      fetch(`/api/bookings?userId=${userId}`).then(r => r.json()),
      fetch(`/api/users/${userId}/pets`).then(r => r.json()),
    ]).then(([b, p]) => {
      setBookings(Array.isArray(b) ? b : []);
      setPets(Array.isArray(p) ? p : []);
    }).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const upcoming = bookings.filter(b => b.status !== "Completed" && b.status !== "Cancelled");

  return (
    <div className="space-y-8">
      {justBooked && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div><p className="font-bold text-green-800">Booking placed successfully!</p><p className="text-sm text-green-700">We&apos;ll confirm your appointment shortly.</p></div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Hello, {userName} 👋</h1>
          <p className="text-secondary mt-1">Welcome to your Pupparazzi dashboard.</p>
        </div>
        <Button asChild className="rounded-full bg-primary text-white hover:bg-primary/90 font-bold px-6">
          <Link href="/book">Book a Service</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upcoming Bookings */}
        <Card className="md:col-span-2 shadow-sm border-none">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Upcoming Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-xl">
                <PawPrint className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-secondary">No upcoming bookings</p>
                <Button variant="link" asChild className="mt-2 text-primary"><Link href="/book">Schedule a session</Link></Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map(b => (
                  <div key={b.id} className="border rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-foreground">{b.service?.name || "Service"}</h3>
                      <p className="text-sm text-secondary">{b.pet?.name} • {b.slot_time} • {new Date(b.slot_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${b.status === "Confirmed" ? "bg-green-100 text-green-700" : b.status === "Pending" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right sidebar */}
        <div className="space-y-6">
          <Card className="shadow-sm border-none bg-linear-to-br from-primary to-accent text-white">
            <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5" /> Wallet</CardTitle></CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">₹0.00</div>
              <p className="text-white/80 text-sm mt-2">Add money for quicker checkouts.</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none">
            <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><PawPrint className="h-5 w-5 text-primary" /> My Pets ({pets.length})</CardTitle></CardHeader>
            <CardContent>
              {pets.length === 0 ? (
                <p className="text-sm text-secondary mb-3">Add your pets to book services.</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {pets.slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center"><PawPrint className="h-4 w-4 text-accent" /></div>
                      <div><p className="text-sm font-bold text-foreground">{p.name}</p><p className="text-xs text-secondary">{p.breed || p.type}</p></div>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full font-bold" asChild>
                <Link href="/book">{pets.length > 0 ? "Book for a Pet" : "Add a Pet"}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
