"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Calendar, PawPrint, Loader2, CheckCircle2,
  Clock, AlertCircle, RotateCcw, XCircle,
  TrendingUp, ChevronRight, Star, History,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

type Booking = {
  id: string;
  booking_id: string;
  status: string;
  payment_status: string;
  slot_date: string;
  slot_time: string;
  service?: { name: string; price: number };
  pet?: { name: string };
};

type Pet = {
  id: string;
  name: string;
  breed?: string;
  type: string;
  image_url?: string;
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  Confirmed: { label: "Confirmed", className: "bg-emerald-50 text-emerald-700 border border-emerald-100", icon: <CheckCircle2 className="h-3 w-3" /> },
  Pending:   { label: "Pending",   className: "bg-amber-50 text-amber-700 border border-amber-100",     icon: <Clock className="h-3 w-3" /> },
  Completed: { label: "Completed", className: "bg-blue-50 text-blue-700 border border-blue-100",        icon: <Star className="h-3 w-3 fill-current" /> },
  Cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600 border border-red-100",           icon: <XCircle className="h-3 w-3" /> },
  InProgress:{ label: "In Progress",className: "bg-violet-50 text-violet-700 border border-violet-100", icon: <RotateCcw className="h-3 w-3 animate-spin" /> },
};

const PAY_CONFIG: Record<string, { label: string; className: string }> = {
  Paid:    { label: "Paid",    className: "bg-emerald-50 text-emerald-700" },
  Pending: { label: "Unpaid",  className: "bg-amber-50 text-amber-700" },
  Refunded:{ label: "Refunded",className: "bg-blue-50 text-blue-700" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border border-slate-200", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.className}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const justBooked = searchParams?.get("booked") === "true";
  const userId = (session?.user as any)?.id;
  const userName = session?.user?.name || "Pet Parent";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  const [showSuccess, setShowSuccess] = useState(justBooked);

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

  useEffect(() => {
    if (showSuccess) {
      const t = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(t);
    }
  }, [showSuccess]);

  async function cancelBooking(bookingId: string, internalId: string) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancellingId(internalId);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: internalId, status: "Cancelled" }),
      });
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === internalId ? { ...b, status: "Cancelled" } : b));
      }
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const upcoming = bookings.filter(b => b.status !== "Completed" && b.status !== "Cancelled");
  const history  = bookings.filter(b => b.status === "Completed" || b.status === "Cancelled");
  const totalSpent = bookings
    .filter(b => b.payment_status === "Paid")
    .reduce((sum, b) => sum + (b.service?.price || 0), 0);

  return (
    <div className="space-y-8">

      {/* Success toast */}
      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-800">Booking placed successfully!</p>
            <p className="text-sm text-emerald-600">A confirmation email has been sent to your inbox.</p>
          </div>
          <button onClick={() => setShowSuccess(false)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Hello, {userName} 👋</h1>
          <p className="text-slate-500 mt-1">Here&apos;s your Pupparazzi dashboard.</p>
        </div>
        <Button asChild className="rounded-full bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold px-6 hover:shadow-lg hover:shadow-pink-200 transition-all">
          <Link href="/book">+ Book a Service</Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Calendar className="h-5 w-5 text-pink-500" />, label: "Total Bookings", value: bookings.length, bg: "bg-pink-50" },
          { icon: <Clock className="h-5 w-5 text-amber-500" />,   label: "Upcoming",       value: upcoming.length, bg: "bg-amber-50" },
          { icon: <PawPrint className="h-5 w-5 text-violet-500" />,label: "My Pets",        value: pets.length,     bg: "bg-violet-50" },
          { icon: <TrendingUp className="h-5 w-5 text-emerald-500" />, label: "Total Spent", value: `₹${totalSpent.toLocaleString("en-IN")}`, bg: "bg-emerald-50" },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className="text-xl font-extrabold text-slate-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bookings column */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                  <Calendar className="h-4 w-4 text-pink-500" /> Bookings
                </CardTitle>
                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                  {(["upcoming", "history"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all capitalize ${activeTab === tab ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {tab === "history" ? <span className="flex items-center gap-1"><History className="h-3 w-3" />History</span> : "Upcoming"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {(activeTab === "upcoming" ? upcoming : history).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-100 rounded-xl">
                  <PawPrint className="h-10 w-10 text-slate-200 mb-3" />
                  <p className="text-slate-400 text-sm font-medium">
                    {activeTab === "upcoming" ? "No upcoming bookings" : "No past bookings"}
                  </p>
                  {activeTab === "upcoming" && (
                    <Button variant="link" asChild className="mt-1 text-pink-500 text-sm font-bold">
                      <Link href="/book">Schedule a session →</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {(activeTab === "upcoming" ? upcoming : history).map(b => {
                    const payCfg = PAY_CONFIG[b.payment_status] ?? { label: b.payment_status, className: "bg-slate-100 text-slate-600" };
                    const canCancel = b.status !== "Cancelled" && b.status !== "Completed";
                    return (
                      <div key={b.id} className="group border border-slate-100 rounded-xl p-4 hover:border-pink-100 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-bold text-sm text-slate-900 truncate">{b.service?.name || "Service"}</h3>
                              <StatusBadge status={b.status} />
                            </div>
                            <p className="text-xs text-slate-500">
                              {b.pet?.name} &nbsp;·&nbsp; {b.slot_time} &nbsp;·&nbsp; {formatDate(b.slot_date)}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs font-bold text-slate-900">₹{b.service?.price?.toLocaleString("en-IN")}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${payCfg.className}`}>{payCfg.label}</span>
                              <span className="text-xs text-slate-400">{b.booking_id}</span>
                            </div>
                          </div>
                          {canCancel && (
                            <button
                              onClick={() => cancelBooking(b.booking_id, b.id)}
                              disabled={cancellingId === b.id}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-400 hover:text-red-600 font-semibold flex items-center gap-1 flex-shrink-0"
                            >
                              {cancellingId === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">

          {/* Quick action */}
          <Card className="border-none shadow-sm bg-gradient-to-br from-pink-500 to-orange-500 text-white">
            <CardContent className="p-5 space-y-4">
              <div className="text-3xl">🐾</div>
              <div>
                <p className="font-bold text-base mb-1">Ready to book?</p>
                <p className="text-white/75 text-xs leading-relaxed">Premium grooming, boarding, vet visits and more.</p>
              </div>
              <Button asChild className="w-full bg-white text-pink-600 hover:bg-pink-50 font-bold text-sm rounded-full">
                <Link href="/book" className="flex items-center justify-center gap-1">Book a Service <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* My Pets */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-900">
                <span className="flex items-center gap-2"><PawPrint className="h-4 w-4 text-pink-500" /> My Pets ({pets.length})</span>
                {pets.length > 0 && (
                  <Link href="/book" className="text-xs text-pink-500 font-bold hover:text-pink-600">+ Add</Link>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pets.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-3xl mb-2">🐶</div>
                  <p className="text-xs text-slate-400 mb-3">No pets added yet.</p>
                  <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-full" asChild>
                    <Link href="/book">Add Your First Pet</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {pets.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-200 to-orange-200 flex items-center justify-center flex-shrink-0">
                        <PawPrint className="h-4 w-4 text-pink-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs text-slate-400 truncate">{p.breed || p.type}</p>
                      </div>
                      <Link href={`/book?pet=${p.id}`} className="ml-auto flex-shrink-0">
                        <ChevronRight className="h-4 w-4 text-slate-300 hover:text-pink-500" />
                      </Link>
                    </div>
                  ))}
                  {pets.length > 4 && (
                    <p className="text-xs text-slate-400 text-center pt-1">+{pets.length - 4} more pets</p>
                  )}
                  <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-full mt-2 border-pink-100 text-pink-600 hover:bg-pink-50" asChild>
                    <Link href="/book">Book for a Pet</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help */}
          <Card className="border-none shadow-sm bg-slate-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1">Need Help?</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Email us at{" "}
                  <a href="mailto:pupparazzipetstore@gmail.com" className="text-pink-500 font-medium hover:underline">
                    pupparazzipetstore@gmail.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
